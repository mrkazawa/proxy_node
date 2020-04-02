const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

//const RequestPool = require('./database/request-pool');

const uuidV1 = require('uuid/v1');
const fs = require('fs');
const PATH = '/home/vagrant/src/data/';
if (!fs.existsSync(PATH)) {
  fs.mkdirSync(PATH);
}

const fsExtra = require('fs-extra')
fsExtra.emptyDirSync(PATH)

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;

const isUsingPriority = true;

const PRIORITY_TYPE = {
  high: 1,
  medium: 2,
  low: 3
};

//const requestPool = new RequestPool();

let highPriorityRequests = new Set();
let mediumPriorityRequests = new Set();
let lowPriorityRequests = new Set();

const app = express();
app.use(bodyParser.json());

app.post('/relay_request', async (req, res) => {
  const {
    data
  } = req.body;

  if (isUsingPriority) {
    const priority = data.priority_id;

    if (PRIORITY_TYPE.high == priority) {
      fs.writeFile(`${PATH}${uuidV1()}.json`, JSON.stringify(data), (err) => {
        if (err) throw err;
        res.status(200).send(`Request is received`);
      });

    }

    /*else if (PRIORITY_TYPE.medium == priority) {
      mediumPriorityRequests.add(data);

    } else if (PRIORITY_TYPE.low == priority) {
      lowPriorityRequests.add(data);

    }*/
  }

  //console.log(highPriorityRequests.size);


});




const {
  Worker,
  isMainThread,
  workerData
} = require('worker_threads');

const rp = require('request-promise-native');
const RateLimiter = require('limiter').RateLimiter;
const limiter = new RateLimiter(3000, 'second');

const payload_400_bytes = {
  app_id: "car_rental_2020",
  task_id: 45637,
  process_id: 50340,
  storage_address: "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
  compute_address: "0x0472ec0185ebb8202f3d4ddb0226998889663cf2",
  compute_network_id: 2020,
  payment_proof: "MYPAYMENTPROOF99999999999999999999999999999999999999999999999999999999",
  priority_id: 3,
  timestamp: Date.now()
};

let immediateId;

// this is used to kill the instance on CTRL-C
process.once('SIGINT', () => {
  clearImmediate(immediateId);
});

/*const worker = new Worker(__filename);
  worker.on('message', console.log);
  worker.on('error', console.error);
  worker.on('exit', code => console.log('worker exit: ', code));*/

  // starts the app server
  app.listen(HTTP_PORT, () => {
    log(chalk.cyan(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`));
  });

if (isMainThread) {
  
} else {
  //loop();
}

function getFileCount() {
  const files = fs.readdirSync(PATH);
  console.log(files.length);
}

function loop() {
  const url = 'http://notary4.local:3000/transact';

  //getFileCount();
  fs.readdir(PATH, function(err, files) {
    if (err) throw err;
    files.forEach(function(filename) {
      fs.readFile(PATH + filename, 'utf-8', function(err, content) {
        if (err) throw err;
        const option = createPostRequest(url, {
          data: JSON.parse(content)
        });
        executeRequest(option);
      });
    });
  });

  immediateId = setImmediate(loop);
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