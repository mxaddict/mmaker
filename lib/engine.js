// libs
const color = require('ansicolor').nice
const ccxt = require('ccxt')
const log = require('ololog')
const numbro = require('numbro')
const path = require('path')

// Make some shorthands for numbro
function fk (symbol, value) {
  return [symbol, numbro(value).format('0,0[.]00000000')]
    .join(' ')
    .replace(/0/g, '0'.darkGray)
}
function fp (value) {
  let format = '00.00%'
  if (value < 0) {
    return numbro(value).format(format).red
  } else if (value > 0) {
    return numbro(value).format(format).green
  }

  return numbro(value).format(format).darkGray
}

module.exports = class Engine {
  constructor (argv) {
    /// Check if we have colors?
    if (color) {
      log.green('COLORS ENABLED')
    }

    // Init our properties
    this.argv = argv
    this.conf = this.loadConf(this.argv.conf)

    this.pollPrice = this.conf.pollPrice || 500     // How often do poll for price changes
    this.pollOrders = this.conf.pollOrders || 500   // How often do poll for order changes
    this.pollTrades = this.conf.pollTrades || 500   // How often do poll for trade changes
    this.pollBalance = this.conf.pollBalance || 500 // How often do poll for balance changes
    this.pollReport = this.conf.pollReport || 5000  // How often do poll for report changes

    this.exchange = this.loadExchange()
    this.exchanges = false
    this.market = this.loadMarket()
    this.marketInfo = false
    this.markets = false
    this.marketsInfo = false

    this.asset = this.market.split('/')[0]
    this.currency = this.market.split('/')[1]

    this.assetBalance = false
    this.assetBalanceDiff = false
    this.assetBalanceStart = false
    this.currencyBalance = false
    this.currencyBalanceConsolidated = false
    this.currencyBalanceConsolidatedDiff = false
    this.currencyBalanceConsolidatedStart = false
    this.currencyBalanceDiff = false
    this.currencyBalanceStart = false
  }

  async start () {
    if (!this.conf) {
      log.error(`Error loading "${this.argv.conf}"`)
      return false
    }

    // Check exchange
    if (!ccxt.exchanges.includes(this.exchange)) {
      log.error(`Exchange "${this.exchange}" is not supported YET`)
      return false
    }

    // Load the exchange
    log.cyan(`Using Exchange "${this.exchange}"`)
    this.exchange = new ccxt[this.exchange](this.conf[this.exchange])

    // Save the markets and marketsInfo
    this.marketsInfo = await this.exchange.loadMarkets()
    this.markets = Object.keys(this.marketsInfo)

    // Check if we selected a market/pair that is valid
    if (!this.markets.includes(this.market)) {
      log.error(`Market "${this.market}" is not supported YET`)
      return false
    }

    // Save the marketInfo
    log.cyan(`Using Market "${this.market}"`)
    this.marketInfo = this.marketsInfo[this.market]

    this.tickPrice()   // Update the market prices
    this.tickOrders()  // Update our orders
    this.tickTrades()  // Update our trades
    this.tickBalance() // Update the balance
    this.tickReport()  // Update the report

    // Give the go ahead
    return true
  }

  async tickPrice () {
    this.orderbook = await this.exchange.fetchOrderBook(this.market)
    this.bid = this.orderbook.bids.length ? this.orderbook.bids[0][0] : undefined
    this.ask = this.orderbook.asks.length ? this.orderbook.asks[0][0] : undefined
    this.fair = (this.bid + this.ask) / 2
    this.spread = (this.bid && this.ask) ? this.ask - this.bid : undefined
    this.spreadPercent = this.spread / this.fair

    setTimeout(() => { this.tickPrice() }, this.pollPrice) // rate limit
  }

  async tickOrders () {
    this.orders = await this.exchange.fetchOpenOrders(this.market)

    setTimeout(() => { this.tickOrders() }, this.pollOrders) // rate limit
  }

  async tickTrades () {
    this.trades = await this.exchange.fetchMyTrades(this.market)

    setTimeout(() => { this.tickTrades() }, this.pollTrades) // rate limit
  }

  async tickBalance () {
    // Load the balances for market
    let balance = await this.exchange.fetchBalance()

    // Check if we have the start balance
    if (!this.assetBalanceStart && !this.currencyBalanceStart) {
      // Save the balances
      this.assetBalanceStart = balance[this.asset].total
      this.currencyBalanceStart = balance[this.currency].total

      // Calculate consolidated balance
      this.currencyBalanceConsolidatedStart = this.currencyBalanceStart + this.assetBalanceStart * this.bid
    } else {
      // Save the balances
      this.assetBalance = balance[this.asset].total
      this.currencyBalance = balance[this.currency].total

      // Calculate the diff
      this.assetBalanceDiff = (this.assetBalance - this.assetBalanceStart) / this.assetBalanceStart
      this.currencyBalanceDiff = (this.currencyBalance - this.currencyBalanceStart) / this.currencyBalanceStart

      // Calculate consolidated balance
      this.currencyBalanceConsolidated = this.currencyBalance + this.assetBalance * this.bid
      this.currencyBalanceConsolidatedDiff =  (this.currencyBalanceConsolidated - this.currencyBalanceConsolidatedStart) / this.currencyBalanceConsolidatedStart
    }

    setTimeout(() => { this.tickBalance() }, this.pollBalance) // rate limit
  }

  async tickReport () {
    if (this.assetBalance && this.assetBalanceStart) {
      log.info(
        // Market flow
        fk(this.currency, this.bid).green,
        '/', fk(this.currency, this.ask).red,
        '/', fk(this.currency, this.spread).cyan,
        '/', fp(this.spreadPercent),

        // Summary
        '|', fk(this.asset, this.assetBalanceStart).yellow, '/', fk(this.asset, this.assetBalance).cyan,
        '|', fk(this.currency, this.currencyBalanceStart).yellow, '/', fk(this.currency, this.currencyBalance).cyan,
        '|', `${fp(this.assetBalanceDiff)} / ${fp(this.currencyBalanceDiff)} / ${fp(this.currencyBalanceConsolidatedDiff)}`
      )
    }

    setTimeout(() => { this.tickReport() }, this.pollReport) // rate limit
  }

  loadConf (confPath) {
    // Tell the user what were loading
    log.cyan(`Loading conf from "${confPath}"`)

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
