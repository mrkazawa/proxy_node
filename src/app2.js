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

  const dataInBase64 = stringToBase64(JSON.stringify(data));

  const sql = `INSERT INTO requests \
    (priority_id, request, created_date) VALUES \
    (${data.priority_id}, '${dataInBase64}', datetime('now', 'localtime'))`;

  const stmt = db.prepare(sql);
  const info = stmt.run();

  if (info.changes > 0) {
    res.status(200).send('request is received');
  } else {
    res.status(500).send('some problem in the database insert');
  }
});

app.listen(HTTP_PORT, () => {
  log(chalk.cyan(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`));
});

//--------------------------- Sender Code ---------------------------//

let immediateId;
let counter = 0;

// execute loop sending to notary
sendToNotary();

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
  const rows = getByPriorityLimited(PRIORITY_TYPE.high, 100);

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

function createTable() {
  const sql = ' \
    CREATE TABLE IF NOT EXISTS requests ( \
        request_id INTEGER PRIMARY KEY AUTOINCREMENT, \
        priority_id INTEGER NOT NULL, \
        request TEXT NOT NULL, \
        created_date TEXT NOT NULL \
    );';

  const stmt = db.prepare(sql);
  stmt.run();
}

function stringToBase64(string) {
  return Buffer.from(string).toString('base64');
}

function base64ToString(base64String) {
  return Buffer.from(base64String, 'base64').toString('ascii');
}