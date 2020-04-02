const chalk = require('chalk');
const log = console.log;



const Database = require('better-sqlite3');
const db = new Database('proxy.db');

const RateLimiter = require('limiter').RateLimiter;
const limiter = new RateLimiter(3000, 'second');

const PRIORITY_TYPE = {
  high: 1,
  medium: 2,
  low: 3
};

const payload_400_bytes = {
  app_id: "car_rental_2020",
  task_id: 45637,
  process_id: 50340,
  storage_address: "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
  compute_address: "0x0472ec0185ebb8202f3d4ddb0226998889663cf2",
  compute_network_id: 2020,
  payment_proof: "MYPAYMENTPROOF99999999999999999999999999999999999999999999999999999999",
  priority_id: 3,
  timestamp: Date.now()
};


