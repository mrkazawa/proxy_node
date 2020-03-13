const rp = require('request-promise-native');

function main() {
  const insertUrl = 'http://proxy1.local:3001/new_request';
  const insertOption = createPostRequest(insertUrl, createPayload());
  executeRequest(insertOption);

  const countUrl = 'http://proxy1.local:3001/request_count';
  const countOption = createGetRequest(countUrl);
  executeRequest(countOption);

  const getAllUrl = 'http://proxy1.local:3001/requests'
  const getAllOption = createGetRequest(getAllUrl);
  executeRequest(getAllOption);
}

function createPayload() {
  return {
    data: {
      app_id: "car_rental_2020",
      task_id: 45637,
      process_id: 50340,
      storage_address: "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
      compute_address: "0x0472ec0185ebb8202f3d4ddb0226998889663cf2",
      compute_network_id: 2020,
      payment_proof: "MYPAYMENTPROOF99999999999999999999999999999999999999999999999999999999",
      priority_id: 3,
      timestamp: Date.now()
    }
  };
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

function createGetRequest(url) {
  return {
    method: 'GET',
    uri: url,
    resolveWithFullResponse: true,
    json: true, // Automatically stringifies the body to JSON
  };
}

function executeRequest(options) {
  rp(options).then(function (response) {
    console.log('Response status code: ', response.statusCode)
    console.log('Response body: ', response.body);
  }).catch(function (err) {
    console.log(err);
  });
}

main();