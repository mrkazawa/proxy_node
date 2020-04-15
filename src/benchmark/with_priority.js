'use strict'

const autocannon = require('autocannon');
const fs = require('fs');
const chalk = require('chalk');
const log = console.log;

const RESULT_PATH = '/home/yustus/result_autocannon.csv';
fs.writeFileSync(RESULT_PATH, '');

const proxyOneUrl = `http://proxy1.local:3001/relay_request`;
const proxyTwoURL = `http://proxy2.local:3001/relay_request`;
const proxyThreeURL = `http://proxy3.local:3001/relay_request`;
const proxyFourURL = `http://proxy4.local:3001/relay_request`;

let instances = [];

instances.push(constructAutoCannonInstance('Proxy #1 Priority #1', proxyOneUrl, 1));
instances.push(constructAutoCannonInstance('Proxy #1 Priority #2', proxyOneUrl, 2));
instances.push(constructAutoCannonInstance('Proxy #1 Priority #3', proxyOneUrl, 3));

instances.push(constructAutoCannonInstance('Proxy #2 Priority #1', proxyTwoURL, 1));
instances.push(constructAutoCannonInstance('Proxy #2 Priority #2', proxyTwoURL, 2));
instances.push(constructAutoCannonInstance('Proxy #2 Priority #3', proxyTwoURL, 3));

instances.push(constructAutoCannonInstance('Proxy #3 Priority #1', proxyThreeURL, 1));
instances.push(constructAutoCannonInstance('Proxy #3 Priority #2', proxyThreeURL, 2));
instances.push(constructAutoCannonInstance('Proxy #3 Priority #3', proxyThreeURL, 3));

instances.push(constructAutoCannonInstance('Proxy #4 Priority #1', proxyFourURL, 1));
instances.push(constructAutoCannonInstance('Proxy #4 Priority #2', proxyFourURL, 2));
instances.push(constructAutoCannonInstance('Proxy #4 Priority #3', proxyFourURL, 3));

instances.forEach(function (instance) {
  runAutoCannon(instance);
  registerTickEvent(instance);
  registerDoneEvent(instance);
});

// this is used to kill the instance on CTRL-C
process.on('SIGINT', function() {
  console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );

  instances.forEach(function (instance) {
    instance.stop();
  });

  process.exit(69);
});

function runAutoCannon(instance) {
  autocannon.track(instance, {
    renderProgressBar: true,
    renderResultsTable: false,
    renderLatencyTable: false,
    progressBarString: `Running :percent | Elapsed :elapsed (seconds) | Rate :rate | ETA :eta (seconds)`
  });
}

function registerTickEvent(instance) {
  instance.on('tick', (counter) => {
    if (counter.counter == 0) {
      log(chalk.red(`${instance.opts.title} WARN! requests possibly is not being processed`));
    }
  });
}

function registerDoneEvent(instance) {
  instance.on('done', (results) => {
    log(chalk.cyan(`${instance.opts.title} Results:`));
    log(chalk.cyan(`Avg Tput (Req/sec): ${results.requests.average}`));
    log(chalk.cyan(`Avg Lat (ms): ${results.latency.average}`));

    const row = instance.opts.title + "," + results.requests.average + "," + results.latency.average + "\r\n";
    fs.appendFileSync(RESULT_PATH, row);
    log(chalk.cyan(`AutoCannon throughput result is saved at ${RESULT_PATH}`));
  });
}

/**
 * Construct a fake IoT application requests for the Core Engine.
 * This object size is about 400 bytes.
 * 
 * @param {nummber} priority_id   The priority id for the fake payload
 */
function constructPayload(priority_id) {
  return {
    app_id: "car_rental_2020",
    task_id: 45637,
    process_id: 50340,
    storage_address: "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
    compute_address: "0x0472ec0185ebb8202f3d4ddb0226998889663cf2",
    compute_network_id: 2020,
    payment_proof: "MYPAYMENTPROOF99999999999999999999999999999999999999999999999999999999",
    priority_id: priority_id,
    timestamp: Date.now()
  }
}

/**
 * Construct an AutoCannon instance.
 * Play around with the 'amount' and 'overallRate' values.
 * 
 * @param {string} title          The string title of this instance
 * @param {string} url            The string target URL for this instance
 * @param {number} priority_id    The priority id for this instance
 */
function constructAutoCannonInstance(title, url, priority_id) {
  return autocannon({
    title: title,
    url: url,
    method: 'POST',
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      data: constructPayload(priority_id)
    }),
    connections: 10, // ITU-T suggests using 10 gateways (concurent connection)
    pipelining: 1, // default
    bailout: 5000, // tolerable number of errors
    //overallRate: 500, // rate of requests to make per second from all connections (set to 500)
    amount: 1250000, // ITU-T suggests 15,000,000 IoT requests per day (divided by 4, then divided by 3)
    duration: 1
  }, console.log);
}