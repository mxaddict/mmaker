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
    this.argv = argv
    this.conf = this.loadConf(this.argv.conf)

    this.exchange = this.loadExchange()
    this.exchanges = false
    this.market = this.loadMarket()
    this.markets = false

    this.asset = this.market.split('/')[0]
    this.assetBalance = 0
    this.assetBalanceStart = 0
    this.currency = this.market.split('/')[1]
    this.currencyBalance = 0
    this.currencyBalanceStart = 0

    // Load our instances
    this.cook = new Cook(this)
    this.waiter = new Waiter(this)
  }

  start () {
    if (!this.conf) {
      log.ERROR(`Error loading "${this.argv.conf}"`)
      return false
    }

    // Check exchange
    if (!ccxt.exchanges.includes(this.exchange)) {
      log.ERROR(`Exchange "${this.exchange}" is not supported YET`)
      return false
    }

    log.INFO(`Using Exchange "${this.exchange}"`)

    // Load the exchange
    this.exchange = new ccxt[this.exchange](this.conf[this.exchange])

    // Load markets from the exchange
    this.exchange.loadMarkets()
      .then((res) => {
        // Save the markets
        this.markets = Object.keys(res)

        // Check if we selected a market/pair that is valid
        if (!this.markets.includes(this.market)) {
          log.ERROR(`Market "${this.market}" is not supported YET`)
        } else {
          log.INFO(`Using Market "${this.market}"`)

          // Load the balances for market
          this.exchange.fetchBalance()
            .then((res) => {
              this.assetBalance = res[this.asset]
              this.assetBalanceStart = res[this.asset]
              this.currencyBalance = res[this.currency]
              this.currencyBalanceStart = res[this.currency]

              log.n(`${this.asset}: `, (`${this.assetBalance.total}`).padEnd(10, '0').padStart(16, ' '))
              log.n(`${this.currency}: `, (`${this.currencyBalance.total}`).padEnd(10, '0').padStart(16, ' '))
              this.waiter.start()
              this.cook.start()
            })
        }
      }, (error) => {
        log.ERROR(`LOAD MARKETS: ${JSON.stringify(error.data)}`)
      })
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
