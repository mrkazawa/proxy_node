const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise-native');
const chalk = require('chalk');
const log = console.log;

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3001;

const Database = require('better-sqlite3');
const db = new Database('proxy.db');
createTable();
clearTable();

const pendingRequests = new Set();
const PENDING_REQUEST_THRESHOLD = 100;

const isUsingPriority = true;

const PRIORITY_TYPE = {
  high: 1,
  medium: 2,
  low: 3
};

const app = express();
app.use(bodyParser.json());

app.post('/relay_request', async (req, res) => {
  const {
    data
  } = req.body;

  pendingRequests.add(data);
  if (pendingRequests.size >= PENDING_REQUEST_THRESHOLD) {

    let rows = [];
    pendingRequests.forEach(element => {
      const dataInBase64 = stringToBase64(JSON.stringify(element));
      const row = `(${element.priority_id}, '${dataInBase64}', datetime('now', 'localtime'))`;
      rows.push(row);
    });

    const placeholders = rows.join(',');
    const sql = `INSERT INTO requests (priority_id, request, created_date) VALUES ${placeholders}`;
    const info = db.prepare(sql).run();

    if (info.changes > 0) {
      pendingRequests.clear();
      res.status(200).send('request is received, queue is cleared and stored in the database');
    } else {
      res.status(500).send('some problem in the database insert');
    }
  } else {
    res.status(200).send('request is received and stored in the queue');
  }
});

app.listen(HTTP_PORT, () => {
  log(chalk.cyan(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`));
});

//--------------------------- Sender Code ---------------------------//

let immediateId;
let counter = 0;

// execute loop sending to notary
//sendToNotary();

// this is used to kill the instance on CTRL-C
process.once('SIGINT', () => {
  clearImmediate(immediateId);
});

function getByPriorityLimited(priority_id, limit) {
  const sql = `SELECT request_id, request FROM requests \
    WHERE priority_id = ${priority_id} \
    ORDER BY created_date ASC \
    LIMIT ${limit}`;

  return db.prepare(sql).all();
}

function deleteByRange(lowestId, highestId) {
  const sql = `DELETE FROM requests \
    WHERE request_id >= ${lowestId} \
    AND request_id <= ${highestId}`;
  const info = db.prepare(sql).run();

  if (info.changes <= 0) {
    log(chalk.red(`${sql} is not executed`));
  }
}

function sendToNotary() {
  const url = 'http://notary4.local:3000/transact';
  const rows = getByPriorityLimited(PRIORITY_TYPE.high, 3000);

  if (rows.length > 0) {
    let ids = [];

    for (const row of rows) {
      ids.push(row.request_id);
      const req = JSON.parse(base64ToString(row.request));

      const option = createPostRequest(url, {
        data: req
      });
      executeRequest(option);
    }

    deleteByRange(Math.min(...ids), Math.max(...ids));
  }

  immediateId = setImmediate(sendToNotary);
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

function clearTable() {
  const sql = 'DELETE FROM requests';
  db.prepare(sql).run();
}

function createTable() {
  const sql = ' \
    CREATE TABLE IF NOT EXISTS requests ( \
        request_id INTEGER PRIMARY KEY AUTOINCREMENT, \
        priority_id INTEGER NOT NULL, \
        request TEXT NOT NULL, \
        created_date TEXT NOT NULL \
    );';

  db.prepare(sql).run();
}

function stringToBase64(string) {
  return Buffer.from(string).toString('base64');
}

function base64ToString(base64String) {
  return Buffer.from(base64String, 'base64').toString('ascii');
}