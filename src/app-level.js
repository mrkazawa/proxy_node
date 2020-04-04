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
const { v1: uuidV1 } = require('uuid');

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

const periodicSending = setInterval(sendToNotary, 1000);

// this is used to kill the instance on CTRL-C
process.once('SIGINT', () => {
  clearInterval(periodicSending);
});

function sendToNotary() {
  const url = 'http://notary4.local:3000/transact';

  highDB.createReadStream({limit: 500})
    .on('data', function (data) {
      const key = data.key.toString('utf8');
      const value = JSON.parse(data.value.toString('utf8'));

      const option = createPostRequest(url, {
        data: value
      });
      executeRequest(option);
      
      highDB.del(key);
    })
    .on('error', function (err) {
      log(chalk.red(`High Priority Streaming Error! ${err}`));
    })

  mediumDB.createReadStream({limit: 350})
    .on('data', function (data) {
      const key = data.key.toString('utf8');
      const value = JSON.parse(data.value.toString('utf8'));

      const option = createPostRequest(url, {
        data: value
      });
      executeRequest(option);
      
      mediumDB.del(key);
    })
    .on('error', function (err) {
      log(chalk.red(`Medium Priority Streaming Error! ${err}`));
    })

  lowDB.createReadStream({limit: 150})
    .on('data', function (data) {
      const key = data.key.toString('utf8');
      const value = JSON.parse(data.value.toString('utf8'));

      const option = createPostRequest(url, {
        data: value
      });
      executeRequest(option);
      
      lowDB.del(key);
    })
    .on('error', function (err) {
      log(chalk.red(`Low Priority Streaming Error! ${err}`));
    })
}

function createPostRequest(url, body) {
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