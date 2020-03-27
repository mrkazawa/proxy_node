const sqlite = require('sqlite');
const chalk = require('chalk');
const log = console.log;

const Util = require('../util');

class SQLiteWrapper {
  constructor() {
    if (SQLiteWrapper._instance) {
      throw new Error('SQLiteWrapper already has an instance!!!');
    }
    SQLiteWrapper._instance = this;

    this.db;
  }

  async connectToDB() {
    try {
      this.db = await sqlite.open('./database/proxy.sqlite');
      log(chalk.cyan('Connected to the Proxy database.'));
    } catch (err) {
      log(chalk.bgRed.black(`FATAL ERROR ${err}`));
      process.exitCode = 1;
    }
  }

  async createTable() {
    const sql = ' \
    CREATE TABLE IF NOT EXISTS requests ( \
        request_id INTEGER PRIMARY KEY AUTOINCREMENT, \
        priority_id INTEGER NOT NULL, \
        request TEXT NOT NULL, \
        created_date TEXT NOT NULL \
    );';

    await this.db.run(sql);
  }

  async saveRequests(requests) {
    let rows = [];

    requests.forEach(element => {
      const convertedRequest = Util.stringToBase64(JSON.stringify(element));
      const row = `(${element.priority_id}, '${convertedRequest}', datetime('now', 'localtime'))`;
      rows.push(row);
    });

    let placeholders = rows.join(',');
    let sql = 'INSERT INTO requests (priority_id, request, created_date) VALUES ' + placeholders;

    try {
      const statement = await this.db.run(sql);
      return statement.lastID;
    } catch (err) {
      log(chalk.red(`ERROR ${err}`));
    }
  }

  async countRequestsByPriority(priority_id) {
    const sql = `SELECT COUNT(*) AS count FROM requests \
        WHERE priority_id = ${priority_id}`;

    try {
      return await this.db.get(sql);
    } catch (err) {
      log(chalk.red(`ERROR ${err}`));
    }
  }

  async getRequestsByPriorityAndLimit(priority_id, limit) {
    const sql = `SELECT request FROM requests \
        WHERE priority_id = ${priority_id} \
        ORDER BY created_date ASC \
        LIMIT ${limit}`;

    try {
      const requestsBase64 = await this.db.all(sql);
      return Util.convertRequestToString(requestsBase64);
    } catch (err) {
      log(chalk.red(`ERROR ${err}`));
    }
  }
}

module.exports = SQLiteWrapper;