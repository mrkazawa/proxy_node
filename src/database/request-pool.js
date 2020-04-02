const levelup = require('levelup');
const leveldown = require('leveldown');
const uuidV1 = require('uuid/v1');
const chalk = require('chalk');
const log = console.log;

class RequestPool {
  constructor() {
    /*if (RequestPool._instance) {
      // this allows the constructor to be called multiple times
      // and refer to the same instance. Another option is to
      // throw an error.
      return RequestPool._instance;
    }
    RequestPool._instance = this;*/

    this.highDB = levelup(leveldown('./high_requests'));
    this.mediumDB = levelup(leveldown('./medium_requests'));
    this.lowDB = levelup(leveldown('./low_requests'));

    if (
      !this.highDB.supports.permanence ||
      !this.mediumDB.supports.permanence ||
      !this.lowDB.supports.permanence
    ) {
      throw new Error('Persistent storage is required');
    }

    this.highDBSize = 0;
  }

  async addToHighStore(value) {
    try {
      await this.highDB.put(uuidV1(), JSON.stringify(value));
      this.highDBSize += 1;
      return true;

    } catch (err) {
      log(chalk.bgRed.black(`FATAL ERROR ${err}`));
      return process.exit(69);
    }
  }

  getFromHighStore(limit) {
    this.highDB.createReadStream({
        limit: limit
      })
      .on('data', async function (data) {
        await this.highDB.del(data.key);
        this.highDBSize -= 1;
        return data.value;
      });
  }

  getCurrentSize() {
    return this.highDBSize;
  }

  clear() {
    this.highDB.clear();
    this.mediumDB.clear();
    this.lowDB.clear();
  }
}

module.exports = RequestPool;