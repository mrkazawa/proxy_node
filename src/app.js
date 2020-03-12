const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;

const Database = require('./database/wrapper_sqlite');

const db = new Database();

async function main() {
  await db.connectToDB();
  await db.createTable();
}

const app = express();
app.use(bodyParser.json());

app.post('/new_request', async (req, res) => {
  const { data } = req.body;
  const dataInBase64 = Buffer.from(JSON.stringify(data)).toString('base64');
  //console.log(Buffer.from("SGVsbG8gV29ybGQ=", 'base64').toString('ascii'));

  try {
    await db.saveRequest(data.priority_id, dataInBase64);
    res.status(200).send('request is saved');
  } catch {
    res.status(500).send('something wrong in the database');
  }
});

app.get('/request_count', async (req, res) => {
  try {
    const count = await db.countRequest(3);
    res.status(200).send(count);
  } catch {
    res.status(500).send('something wrong in the database');
  }
});


app.get('/delete', (req, res) => {

});

// starts the app server
app.listen(HTTP_PORT, () => {
  log(chalk.cyan(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`));
});

// starts the database
main();

/*
https://stackoverflow.com/questions/16554808/leveldb-iterate-keys-by-insertion-order
https://blog.senx.io/demystifying-leveldb/
https://stackoverflow.com/questions/52901734/get-leveldb-length-size-through-iterating-the-db-in-synchronous-way

https://www.npmjs.com/package/monotonic-timestamp
*/
