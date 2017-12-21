// libs
const ccxt = require('ccxt')
const log = require('./log')
const path = require('path')
// parts
const Cashier = require('./cashier')
const Cook = require('./cook')
const Waiter = require('./waiter')

module.exports = class Engine {
  constructor (argv) {
    // Init our properties
    this.argv = argv
    this.conf = this.loadConf(this.argv.conf)

    this.exchange = this.loadExchange()
    this.exchanges = false
    this.market = this.loadMarket()
    this.marketInfo = false
    this.markets = false
    this.marketsInfo = false

    this.asset = this.market.split('/')[0]
    this.assetBalance = 0
    this.assetBalanceStart = 0
    this.currency = this.market.split('/')[1]
    this.currencyBalance = 0
    this.currencyBalanceStart = 0

    // Load our instances
    this.cashier = new Cashier(this)
    this.cook = new Cook(this)
    this.waiter = new Waiter(this)
  }

  async start () {
    if (!this.conf) {
      log.ERROR(`Error loading "${this.argv.conf}"`)
      return false
    }

    // Check exchange
    if (!ccxt.exchanges.includes(this.exchange)) {
      log.ERROR(`Exchange "${this.exchange}" is not supported YET`)
      return false
    }

    // Load the exchange
    log.INFO(`Using Exchange "${this.exchange}"`)
    this.exchange = new ccxt[this.exchange](this.conf[this.exchange])

    // Save the markets and marketsInfo
    this.marketsInfo = await this.exchange.loadMarkets()
    this.markets = Object.keys(this.marketsInfo)

    // Check if we selected a market/pair that is valid
    if (!this.markets.includes(this.market)) {
      log.ERROR(`Market "${this.market}" is not supported YET`)
      return false
    }

    // Save the marketInfo
    log.INFO(`Using Market "${this.market}"`)
    this.marketInfo = this.marketsInfo[this.market]

    // Load the balances for market
    let balance = await this.exchange.fetchBalance()
    this.assetBalance = Object.assign({}, balance[this.asset])
    this.assetBalanceStart = Object.assign({}, balance[this.asset])
    this.currencyBalance = Object.assign({}, balance[this.currency])
    this.currencyBalanceStart = Object.assign({}, balance[this.currency])

    log.n(`${log.k(this.asset, this.assetBalance.total)}`)
    log.n(`${log.k(this.currency, this.currencyBalance.total)}`)

    this.waiter.start()
    this.cook.start()
    this.cashier.start()

    // Give the go ahead
    return true
  }

  loadConf (confPath) {
    // Tell the user what were loading
    log.info(`Loading conf from "${confPath}"`)

    // Check if we have a relative path
    if (!path.isAbsolute(confPath)) {
      // Make sure we move up
      confPath = path.join('../', confPath)
    }

    // Give it back
    return require(path.normalize(confPath))
  }

  loadExchange () {
    let exchange = false

    // Load from conf
    if (this.conf.exchange) {
      exchange = this.conf.exchange
    }

    // Check for override
    if (this.argv.exchange) {
      exchange = this.argv.exchange
    }

    return exchange
  }

  loadMarket () {
    let market = false

    // Load from conf
    if (this.conf.market) {
      market = this.conf.market
    }

    // Check for override
    if (this.argv.market) {
      market = this.argv.market
    }

    return market
  }
}
