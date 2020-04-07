const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise-native');
const chalk = require('chalk');
const log = console.log;

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;

const levelup = require('levelup');
const leveldown = require('leveldown');
const {
  v1: uuidV1
} = require('uuid');

const highDB = levelup(leveldown('./high_priority'));
const mediumDB = levelup(leveldown('./medium_priority'));
const lowDB = levelup(leveldown('./low_priority'));

if (
  !highDB.supports.permanence ||
  !mediumDB.supports.permanence ||
  !lowDB.supports.permanence
) {
  throw new Error('Persistent storage is required');
}

highDB.clear();
mediumDB.clear();
lowDB.clear();

const isUsingPriority = true;

const PRIORITY_TYPE = {
  high: 1,
  medium: 2,
  low: 3
};

const app = express();
app.use(bodyParser.json());

app.post('/relay_request', async (req, res) => {
  const {
    data
  } = req.body;

  if (PRIORITY_TYPE.high == data.priority_id) {
    try {
      highDB.put(uuidV1(), JSON.stringify(data));
      res.status(200).send('request is received and stored in the database');
    } catch (err) {
      res.status(500).send(`something wrong in the database: ${err}`)
    }

  } else if (PRIORITY_TYPE.medium == data.priority_id) {
    try {
      mediumDB.put(uuidV1(), JSON.stringify(data));
      res.status(200).send('request is received and stored in the database');
    } catch (err) {
      res.status(500).send(`something wrong in the database: ${err}`)
    }

  } else if (PRIORITY_TYPE.low == data.priority_id) {
    try {
      lowDB.put(uuidV1(), JSON.stringify(data));
      res.status(200).send('request is received and stored in the database');
    } catch (err) {
      res.status(500).send(`something wrong in the database: ${err}`)
    }

  }
});

app.listen(HTTP_PORT, () => {
  log(chalk.cyan(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`));
});

//--------------------------- Sender Code ---------------------------//

let failCounter = 0; // bailout counter

const targetURL = assignTargetURL(HOSTNAME);

const highPriorityInterval = setInterval(function () {
  sendToNotary(highDB, 550, targetURL);
}, 1000);
const mediumPriorityInterval = setInterval(function () {
  sendToNotary(mediumDB, 300, targetURL);
}, 1000);
const lowPriorityInterval = setInterval(function () {
  sendToNotary(lowDB, 150, targetURL);
}, 1000);

// this is used to kill the instance on CTRL-C
process.once('SIGINT', () => {
  clearInterval(highPriorityInterval);
  clearInterval(mediumPriorityInterval);
  clearInterval(lowPriorityInterval);
});

function assignTargetURL(hostname) {
  if (hostname == 'proxy1') {
    return 'http://notary1.local:3000/transact';

  } else if (hostname == 'proxy2') {
    return `http://notary2.local:3000/transact`;

  } else if (hostname == 'proxy3') {
    return `http://notary3.local:3000/transact`;

  } else if (hostname == 'proxy4') {
    return `http://notary4.local:3000/transact`;
  }
}

/**
 * Iterate over the contents of level DB and send the value to
 * the corresponding notary nodes.
 * 
 * @param {object} db     Level DB object, the database object
 * @param {number} limit  The limit to open the Read Stream API
 */
function sendToNotary(db, limit, url) {
  isSomethingWrongWithNotary(10000);

  db.createReadStream({
      limit: limit
    })
    .on('data', function (data) {
      const key = data.key.toString('utf8');
      const value = JSON.parse(data.value.toString('utf8'));

      const option = createPostRequestOption(url, {
        data: value
      });
      executeRequest(option);

      db.del(key);
    })
    .on('error', function (err) {
      log(chalk.red(`Streaming Error! ${err}`));
    })
}

/**
 * Check the fail bailout, if we see more errors than given threshold
 * while sending data to the notary node, then probably the
 * notary node is down.
 * 
 * @param {number} bailout    The bailout threshold
 */
function isSomethingWrongWithNotary(bailout) {
  if (failCounter > bailout) {
    clearInterval(highPriorityInterval);
    clearInterval(mediumPriorityInterval);
    clearInterval(lowPriorityInterval);

    process.exit(69);
  }
}

function createPostRequestOption(url, body) {
  return {
    method: 'POST',
    uri: url,
    body: body,
    resolveWithFullResponse: true,
    json: true, // Automatically stringifies the body to JSON
  };
}

function executeRequest(options) {
  rp(options).then(function (response) {
    if (response.statusCode != 200) {
      log(chalk.red(`Error with status code ${response.statusCode}`));
    }
  }).catch(function (err) {
    failCounter++;
    log(chalk.red(`Error ${err}`));
  });
}