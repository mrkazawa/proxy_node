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
      this.db = await sqlite.open('./database/proxy.sqlite', { Promise });
      log(chalk.cyan('Connected to the Proxy database.'));
    } catch(err) {
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

}

module.exports = SQLiteWrapper;