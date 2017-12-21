// Load dependencies
const ccxt = require('ccxt')

// Load our project dependencies
const conf = require('./conf')
const log = require('./lib/log')
const Waiter = require('./lib/waiter')

// Get some instances
const waiter = new Waiter()

// Start the waiter
waiter.start()

log(conf)
log(typeof ccxt)
