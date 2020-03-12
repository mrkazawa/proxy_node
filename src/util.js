const chalk = require('chalk');
const log = console.log;

class Util {
  constructor() {
    if (Util._instance) {
      throw new Error('Util already has an instance!!!');
    }
    Util._instance = this;
  }

  static stringToBase64(string) {
    return Buffer.from(string).toString('base64');
  }

  static base64ToString(base64String) {
    return Buffer.from(base64String, 'base64').toString('ascii');
  }

  static convertBase64RequestToString(base64Obj) {
    let requests = [];
    base64Obj.forEach(element => {
      requests.push(this.base64ToString(element.request));
    });
    
    return requests;
  }
}

module.exports = Util;