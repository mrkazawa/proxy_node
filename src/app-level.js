const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise-native');
const chalk = require('chalk');
const log = console.log;

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const isUsingPriority = () => {
  return (process.env.USING_PRIORITY == "true")
};

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

const MAX_THROUGHPUT = 1000; // maximum request per second to the notary node

const targetURL = assignTargetURL(HOSTNAME);

prepare();

/**
 * Used to kill using Ctrl-C
 */
process.on('SIGINT', function () {
  log(chalk.bgRed.black(`\nGracefully shutting down from SIGINT (Ctrl-C)`));
  //clearInterval(newMultiplierInterval);
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

/**
 * Create a softmax array for multiplier limit for Stream API.
 * The assignment is based on the current load, whether there are
 * many pending requests in the store or not.
 * 
 * There are 8 scenarios following 3-bit binary permutation, which is
 * 2 x 2 x 2 = 8
 * 
 * This function can returns 8 types of different scenarios.
 */
// TODO: Add scenario when only one two or one types of priorities

function prepare() {
  const baseMul = [0.5, 0.35, 0.15];

  const maxHigh = baseMul[0] * MAX_THROUGHPUT;
  const maxMedium = baseMul[1] * MAX_THROUGHPUT;
  const maxLow = baseMul[2] * MAX_THROUGHPUT;

  const currentRate = highDBSize + mediumDBSize + lowDBSize;

  if (currentRate > MAX_THROUGHPUT) {
    // we need priority

    if (highDBSize > maxHigh && mediumDBSize > maxMedium && lowDBSize > maxLow) { // case 1
      sendToNotary(PRIORITY_TYPE.high, maxHigh);
      sendToNotary(PRIORITY_TYPE.medium, maxMedium);
      sendToNotary(PRIORITY_TYPE.low, maxLow);

      log(chalk.bgYellow.black(`Case 1`));

    } else if (highDBSize > maxHigh && mediumDBSize > maxMedium && lowDBSize <= maxLow) { // case 2
      
      let newMaxHigh = maxHigh + (maxLow - lowDBSize);
      let newMaxMedium;

      if (highDBSize > newMaxHigh) {
        newMaxMedium = maxMedium;
      } else {
        newMaxMedium = maxMedium + (newMaxHigh - highDBSize);
      }

      sendToNotary(PRIORITY_TYPE.high, newMaxHigh);
      sendToNotary(PRIORITY_TYPE.medium, newMaxMedium);
      sendToNotary(PRIORITY_TYPE.low, -1);

      log(chalk.bgYellow.black(`Case 2`));

    } else if (highDBSize > maxHigh && mediumDBSize <= maxMedium && lowDBSize > maxLow) { // case 3

      let newMaxHigh = maxHigh + (maxMedium - mediumDBSize);
      let newMaxLow;

      if (highDBSize > newMaxHigh) {
        newMaxLow = maxLow;
      } else {
        newMaxLow = maxLow + (newMaxHigh - highDBSize);
      }

      sendToNotary(PRIORITY_TYPE.high, newMaxHigh);
      sendToNotary(PRIORITY_TYPE.medium, -1);
      sendToNotary(PRIORITY_TYPE.low, newMaxLow);

      log(chalk.bgYellow.black(`Case 3`));

    } else if (highDBSize > maxHigh && mediumDBSize <= maxMedium && lowDBSize <= maxLow) { // case 4

      let newMaxHigh = maxHigh + (maxMedium - mediumDBSize) + (maxLow - lowDBSize);

      sendToNotary(PRIORITY_TYPE.high, newMaxHigh);
      sendToNotary(PRIORITY_TYPE.medium, -1);
      sendToNotary(PRIORITY_TYPE.low, -1);

      log(chalk.bgYellow.black(`Case 4`));

    } else if (highDBSize <= maxHigh && mediumDBSize > maxMedium && lowDBSize > maxLow) { // case 5

      let newMaxMedium = maxMedium + (maxHigh - highDBSize);
      let newMaxLow;

      if (mediumDBSize > newMaxMedium) {
        newMaxLow = maxLow;
      } else {
        newMaxLow = maxLow + (newMaxMedium - mediumDBSize);
      }

      sendToNotary(PRIORITY_TYPE.high, -1);
      sendToNotary(PRIORITY_TYPE.medium, newMaxMedium);
      sendToNotary(PRIORITY_TYPE.low, newMaxLow);

      log(chalk.bgYellow.black(`Case 5`));

    } else if (highDBSize <= maxHigh && mediumDBSize > maxMedium && lowDBSize <= maxLow) { // case 6

      let newMaxMedium = maxMedium + (maxHigh - highDBSize) + (maxLow - lowDBSize);

      sendToNotary(PRIORITY_TYPE.high, -1);
      sendToNotary(PRIORITY_TYPE.medium, newMaxMedium);
      sendToNotary(PRIORITY_TYPE.low, -1);

      log(chalk.bgYellow.black(`Case 6`));

    } else if (highDBSize <= maxHigh && mediumDBSize <= maxMedium && lowDBSize > maxLow) { // case 7

      let newMaxLow = maxLow + (maxHigh - highDBSize) + (maxMedium - mediumDBSize);

      sendToNotary(PRIORITY_TYPE.high, -1);
      sendToNotary(PRIORITY_TYPE.medium, -1);
      sendToNotary(PRIORITY_TYPE.low, newMaxLow);

      log(chalk.bgYellow.black(`Case 7`));
    }

  } else {
    // no need priority

    sendToNotary(PRIORITY_TYPE.high, -1);
    sendToNotary(PRIORITY_TYPE.medium, -1);
    sendToNotary(PRIORITY_TYPE.low, -1);

    log(chalk.bgYellow.black(`Case 8`));
  }

  setTimeout(prepare, 1000);
}

/**
 * Iterate over the contents of level DB and send the value to
 * the corresponding notary nodes.
 * 
 * @param {object} db     Level DB object, the database object
 * @param {number} limit  The limit to open the Read Stream API
 */
function sendToNotary(priority_id, limit) {
  let db;

  if (priority_id == PRIORITY_TYPE.high) {
    db = highDB;
  } else if (priority_id == PRIORITY_TYPE.medium) {
    db = mediumDB;
  } else if (priority_id == PRIORITY_TYPE.low) {
    db = lowDB;
  }

  db.createReadStream({
      limit: limit
    })
    .on('data', function (data) {
      const key = data.key.toString('utf8');
      const value = JSON.parse(data.value.toString('utf8'));

      const option = createPostRequestOption(targetURL, {
        data: value
      });
      executeRequest(option);

      db.del(key);
      if (priority_id == PRIORITY_TYPE.high) {
        highDBSize -= 1;
      } else if (priority_id == PRIORITY_TYPE.medium) {
        mediumDBSize -= 1;
      } else if (priority_id == PRIORITY_TYPE.low) {
        lowDBSize -= 1;
      }
    })
    .on('error', function (err) {
      log(chalk.red(`Streaming Error! ${err}`));
    });
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