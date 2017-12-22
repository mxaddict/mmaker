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

    this.pollPrice = this.conf.pollPrice || 5000            // How often do poll for price changes
    this.pollOrders = this.conf.pollOrders || 5000          // How often do poll for order changes
    this.pollOrdersBuy = this.conf.pollOrdersBuy || 15000   // How often do poll for order changes
    this.pollOrdersSell = this.conf.pollOrdersSell || 15000 // How often do poll for order changes
    this.pollTrades = this.conf.pollTrades || 30000         // How often do poll for trade changes
    this.pollBalance = this.conf.pollBalance || 20000       // How often do poll for balance changes
    this.pollReport = this.conf.pollReport || 20000         // How often do poll for report changes

    // Get order settings
    this.minWidthPercent = (this.conf.minWidthPercent || 0.2) / 100
    this.minWidthPercentIncrement = (this.conf.minWidthPercentIncrement || 0.1) / 100
    this.maxBullets = this.conf.maxBullets || 3
    this.orderSize = this.conf.orderSize || 0

    this.exchange = this.loadExchange()
    this.exchanges = false
    this.market = this.loadMarket()
    this.marketInfo = false
    this.markets = false
    this.marketsInfo = false

    this.asset = this.market.split('/')[0]
    this.currency = this.market.split('/')[1]

    this.started = false
    this.orderBuyFair = false
    this.orderSellFair = false

    this.orders = []
    this.ordersBuy = []
    this.ordersSell = []

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

    this.tickPrice()      // Update the market prices
    this.tickOrders()     // Update our orders
    this.tickOrdersBuy()  // Update our orders buy
    this.tickOrdersSell() // Update our orders sell
    this.tickTrades()     // Update our trades
    this.tickBalance()    // Update the balance
    this.tickReport()     // Update the report

    // Give the go ahead
    return true
  }

  async tickPrice () {
    try {
      this.orderbook = await this.exchange.fetchOrderBook(this.market)
      this.bid = this.orderbook.bids.length ? this.orderbook.bids[0][0] : undefined
      this.ask = this.orderbook.asks.length ? this.orderbook.asks[0][0] : undefined
      this.fair = (this.bid + this.ask) / 2
      this.spread = (this.bid && this.ask) ? this.ask - this.bid : undefined
      this.spreadPercent = this.spread / this.bid
    } catch (e) {
      /* handle error */
      log.error(e)
    }

    setTimeout(() => { this.tickPrice() }, this.pollPrice) // rate limit
  }

  async tickOrders () {
    try {
      // Load current orders
      this.orders = await this.exchange.fetchOpenOrders(this.market)

      // Filter buy orders
      this.ordersBuy = this.orders.filter((order) => {
        return order.side === 'buy'
      })

      // Filter sell orders
      this.ordersSell = this.orders.filter((order) => {
        return order.side === 'sell'
      })
    } catch (e) {
      /* handle error */
      log.error(e)
    }

    setTimeout(() => { this.tickOrders() }, this.pollOrders) // rate limit
  }

  async tickOrdersBuy () {
    try {
      if (this.started) {
        // Check if we need to update orders
        if (this.orderBuyFair !== this.fair || this.ordersBuy.length !== this.maxBullets) {
        // if (this.ordersBuy.length !== this.maxBullets) {
          this.cleanOrders(this.ordersBuy)
        }

        if (!this.ordersBuy.length) {
          let price = 0

          price = this.fair - this.fair * this.minWidthPercent
          if (this.bid < price) {
            price = this.bid
          }
          for (let i = 0, len = this.maxBullets; i < len; i++) {
            price -= price * this.minWidthPercentIncrement

            this.adjustOrderSize(price)

            if (price * this.orderSize <= this.currencyBalance) {
              // log(`limit buy ${this.asset} ${this.orderSize} @ ${this.currency} ${price}`)
              this.exchange.createLimitBuyOrder(this.market, this.orderSize, price)
            }
          }

          // Save the used fair
          this.orderBuyFair = this.fair
        }
      }
    } catch (e) {
      /* handle error */
      log.error(e)
    }

    setTimeout(() => { this.tickOrdersBuy() }, this.pollOrdersBuy) // rate limit
  }

  async tickOrdersSell () {
    try {
      if (this.started) {
        // Check if we need to update orders
        if (this.orderSellFair !== this.fair || this.ordersSell.length !== this.maxBullets) {
        // if (this.ordersSell.length !== this.maxBullets) {
          this.cleanOrders(this.ordersSell)
        }

        if (!this.ordersSell.length) {
          let price = 0

          price = this.fair + this.fair * this.minWidthPercent
          if (this.ask > price) {
            price = this.ask
          }
          for (let i = 0, len = this.maxBullets; i < len; i++) {
            price += price * this.minWidthPercentIncrement

            this.adjustOrderSize(price)

            if (this.orderSize <= this.assetBalance) {
              // log(`limit sell ${this.asset} ${this.orderSize} @ ${this.currency} ${price}`)
              this.exchange.createLimitSellOrder(this.market, this.orderSize, price)
            }
          }

          // Save the used fair
          this.orderSellFair = this.fair
        }
      }
    } catch (e) {
      /* handle error */
      log.error(e)
    }

    setTimeout(() => { this.tickOrdersSell() }, this.pollOrdersSell) // rate limit
  }

  async tickTrades () {
    // this.trades = await this.exchange.fetchMyTrades(this.market)

    // setTimeout(() => { this.tickTrades() }, this.pollTrades) // rate limit
  }

  async tickBalance () {
    try {
      // Load the balances for market
      let balance = await this.exchange.fetchBalance()

      // Check if we have the start balance
      if (!this.started && this.bid) {
        // We saved start balance
        this.started = true

        // Save the balances
        this.assetBalanceStart = balance[this.asset].total
        this.currencyBalanceStart = balance[this.currency].total

        // Calculate consolidated balance
        this.currencyBalanceConsolidatedStart = this.currencyBalanceStart + this.assetBalanceStart * this.bid
      }

      // Save the balances
      this.assetBalance = balance[this.asset].total
      this.currencyBalance = balance[this.currency].total

      // Calculate the diff
      this.assetBalanceDiff = (this.assetBalance - this.assetBalanceStart) / this.assetBalanceStart
      this.currencyBalanceDiff = (this.currencyBalance - this.currencyBalanceStart) / this.currencyBalanceStart

      // Calculate consolidated balance
      this.currencyBalanceConsolidated = this.currencyBalance + this.assetBalance * this.bid
      this.currencyBalanceConsolidatedDiff = (this.currencyBalanceConsolidated - this.currencyBalanceConsolidatedStart) / this.currencyBalanceConsolidatedStart
    } catch (e) {
      /* handle error */
      log.error(e)
    }

    setTimeout(() => { this.tickBalance() }, this.pollBalance) // rate limit
  }

  async tickReport () {
    try {
      if (this.started) {
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
    } catch (e) {
      /* handle error */
      log.error(e)
    }

    setTimeout(() => { this.tickReport() }, this.pollReport) // rate limit
  }

  async cleanOrders (orders = []) {
    try {
      for (var i = 0, len = orders.length; i < len; i++) {
        if (typeof orders[i] !== 'undefined') {
          this.exchange.cancelOrder(this.orders[i].id, this.market)
        }
      }
    } catch (e) {
      /* handle error */
      log.error(e)
    }
  }

  adjustOrderSize (price) {
    // Reset to default
    this.orderSize = this.marketInfo.limits.amount.min

    // Check order cost
    if (this.orderSize * price < this.marketInfo.limits.cost.min) {
      this.orderSize = this.marketInfo.limits.cost.min / price * 1.1
    }
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
