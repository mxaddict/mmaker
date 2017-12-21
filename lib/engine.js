const path = require('path')
const log = require('./log')
const Waiter = require('./waiter')

module.exports = class Engine {
  constructor (argv) {
    // Init our properties
    this.init()

    this.conf = this.loadConf(argv.conf)
    this.conf = this.validateConf(this.conf)

    // Load our instances
    this.waiter = new Waiter()
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
  }

  loadConf(confPath) {
    if (!path.isAbsolute(confPath)) {
      confPath = path.join('../', confPath)
    }

    return require(path.normalize(confPath))
  }

  validateConf (conf) {
    // Check if we have a valid exchange
    if (!this.allowedExchanges.includes(conf.exchange.name)) {
      log.ERROR(`"${conf.exchange.name}" is not a supported Exchange`)
      return false
    }

    // We made it!
    return conf
  }
}
