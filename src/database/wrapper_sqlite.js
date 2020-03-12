const sqlite = require('sqlite');
const chalk = require('chalk');
const log = console.log;

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
      log(chalk.red(`ERROR ${err}`));
      process.exitCode = 1;
    }
  }

  async createTable() {
    const sql = ' \
    CREATE TABLE IF NOT EXISTS requests ( \
        request_id INTEGER PRIMARY KEY AUTOINCREMENT, \
        priority_id INTEGER NOT NULL, \
        request TEXT NOT NULL \
    );';
    await this.db.run(sql);
  }

  async saveRequest(priority_id, request) {
    const sql = `INSERT INTO requests (priority_id, request) VALUES (${priority_id}, "${request}")`;
    try {
      const statement = await this.db.run(sql);
      console.log(statement.lastID);
    } catch (err) {
      log(chalk.red(`ERROR ${err}`));
    }
  }

  async countRequestsByPriority(priority_id) {
    const sql = `SELECT COUNT(*) AS count FROM requests WHERE priority_id = ${priority_id}`;
    try {
      return await this.db.get(sql);
    } catch (err) {
      log(chalk.red(`ERROR ${err}`));
    }
  }

  async getRequestsByPriorityAndLimit(priority_id, limit) {
    const sql = `SELECT request FROM requests WHERE priority_id = ${priority_id}`;
    try {
      return await this.db.all(sql);
    } catch (err) {
      log(chalk.red(`ERROR ${err}`));
    }
  }
}

module.exports = SQLiteWrapper;