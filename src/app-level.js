const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise-native');
const chalk = require('chalk');
const log = console.log;

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const isUsingPriority = () => { return (process.env.USING_PRIORITY == "true") };

const levelup = require('levelup');
const leveldown = require('leveldown');
const {
  v1: uuidV1
} = require('uuid');

const highDB = levelup(leveldown('./high_priority'));
const mediumDB = levelup(leveldown('./medium_priority'));
const lowDB = levelup(leveldown('./low_priority'));

// use our own counter because we cannot query size from leveldown
let highDBSize = 0;
let mediumDBSize = 0;
let lowDBSize = 0;

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
      highDBSize += 1;
      res.status(200).send('request is received and stored in the database');

    } catch (err) {
      res.status(500).send(`something wrong in the database: ${err}`)
    }

  } else if (PRIORITY_TYPE.medium == data.priority_id) {
    try {
      mediumDB.put(uuidV1(), JSON.stringify(data));
      mediumDBSize += 1;
      res.status(200).send('request is received and stored in the database');

    } catch (err) {
      res.status(500).send(`something wrong in the database: ${err}`)
    }

  } else if (PRIORITY_TYPE.low == data.priority_id) {
    try {
      lowDB.put(uuidV1(), JSON.stringify(data));
      lowDBSize += 1;
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

const targetURL = assignTargetURL(HOSTNAME);

let multiplierLimit = assignMultiplierLimit();
const MAX_THROUGHPUT = 800; // maximum request per second to the notary node

let highLimit = multiplierLimit[0] * MAX_THROUGHPUT;
let mediumLimit = multiplierLimit[1] * MAX_THROUGHPUT;
let lowLimit = multiplierLimit[2] * MAX_THROUGHPUT;

const highPriorityInterval = setInterval(function () {
  sendToNotary(highDB, highDBSize, highLimit, targetURL);
}, 1000);
const mediumPriorityInterval = setInterval(function () {
  sendToNotary(mediumDB, mediumDBSize, mediumLimit, targetURL);
}, 1000);
const lowPriorityInterval = setInterval(function () {
  sendToNotary(lowDB, lowDBSize, lowLimit, targetURL);
}, 1000);

// this is used to kill the instance on CTRL-C
process.on('SIGINT', function() {
  console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );

  clearInterval(highPriorityInterval);
  clearInterval(mediumPriorityInterval);
  clearInterval(lowPriorityInterval);

  process.exit(69);
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

function assignMultiplierLimit() {
  if (isUsingPriority()) {
    return [0.55, 0.35, 0.15];
  } else {
    return [0.34, 0.33, 0.33];
  }
}

/**
 * Iterate over the contents of level DB and send the value to
 * the corresponding notary nodes.
 * 
 * @param {object} db     Level DB object, the database object
 * @param {number} limit  The limit to open the Read Stream API
 */
function sendToNotary(db, counter, limit, url) {
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
      counter -= 1;
    })
    .on('error', function (err) {
      log(chalk.red(`Streaming Error! ${err}`));
    })
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
    log(chalk.red(`Error ${err}`));
  });
}