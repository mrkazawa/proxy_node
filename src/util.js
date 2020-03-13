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

  static convertRequestToString(requests) {
    let convertedRequests = [];
    requests.forEach(element => {
      convertedRequests.push(this.base64ToString(element.request));
    });
    
    return convertedRequests;
  }
}

module.exports = Util;