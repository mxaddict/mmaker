// libs
const ccxt = require('ccxt')
const log = require('./log')
const path = require('path')
// parts
const Cook = require('./cook')
const Waiter = require('./waiter')

module.exports = class Engine {
  constructor (argv) {
    // Init our properties
    this.init()

    // Load and validate the conf
    this.conf = this.confLoad(argv.conf)

    // Load the exchange
    this.exchange = new ccxt[this.conf.exchange.name]({
      apiKey: this.conf.exchange.creds.key,
      secret: this.conf.exchange.creds.secret
    })

    // Load our instances
    this.cook = new Cook(this)
    this.waiter = new Waiter(this)
  }

  init () {
    // What exchanges do we support for now?
    this.allowedExchanges = [ 'binance' ]
  }

  start () {
    if (!this.conf) {
      return false
    }

    this.waiter.start()
    this.cook.start()
  }

  confLoad (confPath) {
    if (!path.isAbsolute(confPath)) {
      confPath = path.join('../', confPath)
    }

    return this.confValidate(require(path.normalize(confPath)))
  }

  confValidate (conf) {
    // Check if we have a valid exchange
    if (!this.allowedExchanges.includes(conf.exchange.name)) {
      log.ERROR(`"${conf.exchange.name}" is not a supported Exchange`)
      return false
    }

    // We made it!
    return conf
  }
}
