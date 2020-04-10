const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs-extra');
const RateLimiter = require('limiter').RateLimiter;
const levelup = require('levelup');
const leveldown = require('leveldown');
const {
  v1: uuidV1
} = require('uuid');

const chalk = require('chalk');
const log = console.log;

const os = require("os");
const HOSTNAME = os.hostname();

const HTTP_PORT = process.env.HTTP_PORT || 3001;
const isUsingPriority = () => {
  return (process.env.USING_PRIORITY == "true");
};

fs.emptyDirSync('./high_priority');
fs.emptyDirSync('./medium_priority');
fs.emptyDirSync('./low_priority');

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

try {
  highDB.clear();
  mediumDB.clear();
  lowDB.clear();
} catch (err) {
  throw new Error('Cannot clear database');
}

// use our own counter because we cannot query size from leveldown
let highDBSize = 0;
let mediumDBSize = 0;
let lowDBSize = 0;

const PRIORITY_TYPE = {
  high: 1,
  medium: 2,
  low: 3
};

//--------------------------- Receiver Code ---------------------------//

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

const MAX_THROUGHPUT = 800; // maximum request per second to the notary node
const targetURL = assignTargetURL(HOSTNAME);

if (isUsingPriority()) {
  prepareWithPriority();
} else {
  prepareWithoutPriority();
}

/**
 * Used to kill using Ctrl-C
 */
process.on('SIGINT', function () {
  log(chalk.bgRed.black(`\nGracefully shutting down from SIGINT (Ctrl-C)`));
  process.exit(69);
});

/**
 * Assign the URL of the notary node according to the hostname of the machine.
 * It is a one-to-one mapping between the proxy machine with the notary machine.
 * 
 * @param {string} hostname   The hostname of the given machine
 */
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
 * Prepare the strategy to send contents of the database to
 * the notary node.
 * 
 * This method will apply the priority, therefore, it will try to
 * include as many higher priority requests first.
 * The order is HIGH, MEDIUM, and then LOW priority.
 */
function prepareWithPriority() {
  const baseMul = [0.5, 0.35, 0.15];

  const maxHigh = baseMul[0] * MAX_THROUGHPUT;
  const maxMedium = baseMul[1] * MAX_THROUGHPUT;
  const maxLow = baseMul[2] * MAX_THROUGHPUT;

  const currentRate = highDBSize + mediumDBSize + lowDBSize;

  if (currentRate > MAX_THROUGHPUT) {

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
    sendToNotary(PRIORITY_TYPE.high, -1);
    sendToNotary(PRIORITY_TYPE.medium, -1);
    sendToNotary(PRIORITY_TYPE.low, -1);

    log(chalk.bgYellow.black(`Case 8`));
  }

  setTimeout(prepareWithPriority, 1000); // loop
}

/**
 * Prepare the strategy to send contents of the database to
 * the notary node.
 * 
 * This method will not apply any priority, therefore, it will
 * try to balance between HIGH, MEDIUM, and LOW priority requests
 * will equal distribution.
 */
function prepareWithoutPriority() {
  const baseMul = [0.33, 0.33, 0.33];

  const maxHigh = baseMul[0] * MAX_THROUGHPUT;
  const maxMedium = baseMul[1] * MAX_THROUGHPUT;
  const maxLow = baseMul[2] * MAX_THROUGHPUT;

  const currentRate = highDBSize + mediumDBSize + lowDBSize;

  if (currentRate > MAX_THROUGHPUT) {
    sendToNotary(PRIORITY_TYPE.high, maxHigh);
    sendToNotary(PRIORITY_TYPE.medium, maxMedium);
    sendToNotary(PRIORITY_TYPE.low, maxLow);

    log(chalk.bgYellow.black(`Case A`));

  } else {
    sendToNotary(PRIORITY_TYPE.high, -1);
    sendToNotary(PRIORITY_TYPE.medium, -1);
    sendToNotary(PRIORITY_TYPE.low, -1);

    log(chalk.bgYellow.black(`Case B`));
  }

  setTimeout(prepareWithoutPriority, 1000); // loop
}

/**
 * Sending contents from database to the notary node.
 * First, the method will iterate over the contents of level DB
 * Then, it sends the value to the corresponding notary nodes.
 * 
 * @param {number} priority_id  The priority id of the request to be sent
 * @param {number} limit        The limit to open the Read Stream API
 */
function sendToNotary(priority_id, limit) {
  let limiter = new RateLimiter(limit, 1000);

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

      limiter.removeTokens(1, function() {
        executeRequest(option);
      });

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
      throw new Error(`Streaming Error! ${err}`);
    });
}

/**
 * Create a request object for axios module.
 * 
 * @param {string} url    The string of the target URL
 * @param {object} body   The JSON object to be included in the body of request
 */
function createPostRequestOption(url, body) {
  return {
    method: 'POST',
    url: url,
    data: body
  };
}

/**
 * Execute the HTTP request using axios module.
 * This method will not process the response. However, 
 * it will display error when the status code is not 200.
 * It will also throw any possible error.
 * 
 * @param {object} options  The request object to be executed
 */
function executeRequest(options) {
  axios(options).then(function (response) {
    if (response.status != 200) {
      log(chalk.red(`Error with status code ${response.status}`));
    }
  }).catch(function (err) {
    throw new Error(`Sending Error! ${err}`);
  });;
}