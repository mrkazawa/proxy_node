const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

//const Database = require('./database/wrapper-sqlite');
const RequestPool = require('./database/request-pool');

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;

//const db = new Database();
const requestPool = new RequestPool();

const isUsingPriority = true;

const PRIORITY_TYPE = {
  high: 1,
  medium: 2,
  low: 3
};

let highPriorityRequests = new Set();
let mediumPriorityRequests = new Set();
let lowPriorityRequests = new Set();

async function main() {
  await db.connectToDB();
  await db.createTable();
}

const app = express();
app.use(bodyParser.json());

app.post('/relay_request', async (req, res) => {
  const {
    data
  } = req.body;

  if (isUsingPriority) {
    const priority = data.priority_id;

    if (PRIORITY_TYPE.high == priority) {
      highPriorityRequests.add(data);

    } else if (PRIORITY_TYPE.medium == priority) {
      mediumPriorityRequests.add(data);

    } else if (PRIORITY_TYPE.low == priority) {
      lowPriorityRequests.add(data);

    }
  }

  res.status(200).send(`Request is received`);
});

const rp = require('request-promise-native');
const RateLimiter = require('limiter').RateLimiter;
const limiter = new RateLimiter(3000, 'second');

const payload_400_bytes = {
  data: {
    app_id: "car_rental_2020",
    task_id: 45637,
    process_id: 50340,
    storage_address: "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
    compute_address: "0x0472ec0185ebb8202f3d4ddb0226998889663cf2",
    compute_network_id: 2020,
    payment_proof: "MYPAYMENTPROOF99999999999999999999999999999999999999999999999999999999",
    priority_id: 3,
    timestamp: Date.now()
  }
};

let immediateId;

const {
  Worker,
  isMainThread,
  parentPort,
  workerData
} = require('worker_threads');

if (isMainThread) {
  new Worker(__filename);
  
  // starts the app server
  app.listen(HTTP_PORT, () => {
    log(chalk.cyan(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`));
  });

} else {
  console.log('Running the loop!');
  loop();
}

function loop() {
  limiter.removeTokens(1, function (err, remainingRequests) {
    // err will only be set if we request more than the maximum number of
    // requests we set in the constructor

    // remainingRequests tells us how many additional requests could be sent
    // right this moment

    const url = 'http://notary4.local:3000/transact';
    const payload = payload_400_bytes;
    const option = createPostRequest(url, payload);
    executeRequest(option);
  });

  immediateId = setImmediate(loop);
}

// this is used to kill the instance on CTRL-C
process.once('SIGINT', () => {
  clearImmediate(immediateId);
});

app.post('/new_request', async (req, res) => {
  const {
    data
  } = req.body;

  const thresholdReached = requestPool.add(data);
  if (thresholdReached) {
    const pendingRequests = requestPool.getAll();
    requestPool.clear();

    const lastId = await db.saveRequests(pendingRequests);

    res.status(200).send(`Inserted to database: ${lastId}`);
  } else {
    res.status(200).send(`Request is received`);
  }

  sendToNotaryNode();
});

app.get('/request_count', async (req, res) => {
  try {
    const count = await db.countRequestsByPriority(3);
    res.status(200).send(count);
  } catch {
    res.status(500).send('something wrong in the database');
  }
});

app.get('/requests', async (req, res) => {
  try {
    const requests = await db.getRequestsByPriorityAndLimit(3, 2);
    res.status(200).send(requests);
  } catch {
    res.status(500).send('something wrong in the database');
  }
});

// starts the database
//main();






async function sendToNotaryNode() {
  const url = 'http://notary1.local:3000/transact';
  const payload = await getPayload();
  //console.log(payload);

  const option = createPostRequest(url, {
    data: payload
  });
  executeRequest(option);
}

async function getPayload() {
  const payload = await db.getRequestsByPriorityAndLimit(3, 1);
  return JSON.parse(payload);
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

//setInterval(throttle, 1000);

/*
https://stackoverflow.com/questions/16554808/leveldb-iterate-keys-by-insertion-order
https://blog.senx.io/demystifying-leveldb/
https://stackoverflow.com/questions/52901734/get-leveldb-length-size-through-iterating-the-db-in-synchronous-way

https://www.npmjs.com/package/monotonic-timestamp
*/