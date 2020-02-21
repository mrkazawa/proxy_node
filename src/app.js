const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;

const app = express();
app.use(bodyParser.json());

app.get('/pending_requests', (req, res) => {
  res.json('cool');
});

app.post('/transact', (req, res) => {
  const { data } = req.body;

  res.status(200).send('transaction_received');
});

// starts the app server
app.listen(HTTP_PORT, () => {
  log(chalk.cyan(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`));
});