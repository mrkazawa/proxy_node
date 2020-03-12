const rp = require('request-promise-native');

function main() {
  const payload = {
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

  let options = {
    method: 'POST',
    uri: 'http://proxy1.local:3001/new_request',
    body: payload,
    resolveWithFullResponse: true,
    json: true // Automatically stringifies the body to JSON
  };
  rp(options).then(function (response) {
    console.log('Response status code: ', response.statusCode)
    console.log('Response body: ', response.body);
  }).catch(function (err) {
    console.log(err);
  });

  options = {
    method: 'GET',
    uri: 'http://proxy1.local:3001/request_count',
    resolveWithFullResponse: true,
    json: true // Automatically stringifies the body to JSON
  };
  rp(options).then(function (response) {
    console.log('Response status code: ', response.statusCode)
    console.log('Response body: ', response.body);
  }).catch(function (err) {
    console.log(err);
  });

  options = {
    method: 'GET',
    uri: 'http://proxy1.local:3001/requests',
    resolveWithFullResponse: true,
    json: true // Automatically stringifies the body to JSON
  };
  rp(options).then(function (response) {
    console.log('Response status code: ', response.statusCode)
    console.log('Response body: ', response.body);
  }).catch(function (err) {
    console.log(err);
  });
}

main();