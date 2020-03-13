const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

const Database = require('./database/wrapper-sqlite');
const RequestPool = require('./database/request-pool');

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;

const db = new Database();
const requestPool = new RequestPool();

async function main() {
  await db.connectToDB();
  await db.createTable();
}

const app = express();
app.use(bodyParser.json());

app.post('/new_request', async (req, res) => {
  const { data } = req.body;

  const thresholdReached = requestPool.add(data);
  if (thresholdReached) {
    const pendingRequests = requestPool.getAll();
    requestPool.clear();
    
    const lastId = await db.saveRequests(pendingRequests);
    
    res.status(200).send(`Inserted to database: ${lastId}`);
  } else {
    res.status(200).send(`Request is received`);
  }
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
