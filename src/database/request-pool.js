const REQUEST_PENDING_THRESHOLD = 300;

class RequestPool {
  constructor() {
    if (RequestPool._instance) {
      throw new Error('RequestPool already has an instance!!!');
    }
    RequestPool._instance = this;

    this.pendingRequests = [];
  }

  add(request) {
    this.pendingRequests.push(request);
    return (this.pendingRequests.length >= REQUEST_PENDING_THRESHOLD);
  }

  getAll() {
    return this.pendingRequests;
  }

  clear() {
    this.pendingRequests = [];
  }
}

module.exports = RequestPool;