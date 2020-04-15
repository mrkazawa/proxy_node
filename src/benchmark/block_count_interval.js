const axios = require('axios');
const fs = require('fs');
const chalk = require('chalk');
const log = console.log;

const COUNT_PATH = '/home/yustus/result_block_count.json';
fs.writeFileSync(COUNT_PATH, '');

const txCountPerBlockURL = 'http://notary1.local:3000/tx_count_per_block';
const intervalId = setInterval(function () {
  saveTxCountInBlock(txCountPerBlockURL);
}, 5000);

// this is used to kill the instance on CTRL-C
process.on('SIGINT', function () {
  log(chalk.bgRed.white(`\nGracefully shutting down from SIGINT (Ctrl-C)`));
  clearInterval(intervalId);
  process.exit(69);
});

/**
 * Get the Tx Count Per Block from the notary node and
 * saves it to the local storage.
 * 
 * @param {string} url    The string URL to query for the Tx count
 */
function saveTxCountInBlock(url) {
  const options = {
    method: 'GET',
    url: url
  };

  axios(options).then(function (response) {
    if (response.status == 200) {
      fs.writeFileSync(COUNT_PATH, JSON.stringify(response.data));
      log(chalk.cyan(`Block count is saved at ${COUNT_PATH}`));

    } else {
      log(chalk.red(`Received error code of ${response.status}`));
    }

  }).catch(function (err) {
    log(chalk.red(`Error due to ${err}`));
  });
}