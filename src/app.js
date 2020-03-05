const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;

const Database = require('./database/wrapper_sqlite');

const app = express();
app.use(bodyParser.json());

app.post('/set', async (req, res) => {
  const { data } = req.body;


});


app.get('/get', async (req, res) => {


});


app.get('/delete', (req, res) => {

});

// starts the app server
app.listen(HTTP_PORT, () => {
  log(chalk.cyan(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`));
});

const db = new Database();

async function main() {
  await db.connectToDB();
  await db.createTable();
  console.log(db);
}

// starts the database
main();

/*
https://stackoverflow.com/questions/16554808/leveldb-iterate-keys-by-insertion-order
https://blog.senx.io/demystifying-leveldb/
https://stackoverflow.com/questions/52901734/get-leveldb-length-size-through-iterating-the-db-in-synchronous-way

https://www.npmjs.com/package/monotonic-timestamp
*/
