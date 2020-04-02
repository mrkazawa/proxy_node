const chalk = require('chalk');
const log = console.log;

const uuidV1 = require('uuid/v1');
const fs = require('fs');
const PATH = '/home/vagrant/src/data/';
if (!fs.existsSync(PATH)) {
  fs.mkdirSync(PATH);
}

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;

const isUsingPriority = true;

const PRIORITY_TYPE = {
  high: 1,
  medium: 2,
  low: 3
};

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

loop();

// this is used to kill the instance on CTRL-C
process.once('SIGINT', () => {
  clearImmediate(immediateId);
});

function getFileCount() {
  const files = fs.readdirSync(PATH);
  console.log(files.length);
}

function loop() {
  const url = 'http://notary4.local:3000/transact';

  //getFileCount();
  fs.readdir(PATH, function(err, files) {
    if (err) {
      log(chalk.red(`Error reading directory ${err}`));
      throw err;
    }
    files.forEach(function(filename) {
      fs.readFile(`${PATH}${filename}`, 'utf-8', function(err, content) {
        if (err) {
          log(chalk.red(`Error reading file ${err}`));
          throw err;
        }
        console.log(content);
        /*const option = createPostRequest(url, {
          data: JSON.parse(content)
        });
        executeRequest(option);*/
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