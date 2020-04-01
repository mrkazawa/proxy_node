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