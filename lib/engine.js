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

    this.pollInfo = this.conf.pollInfo || 10000            // How often do poll for price and balance changes
    this.pollOrders = this.conf.pollOrders || 20000        // How often do poll for order changes
    this.pollReport = this.conf.pollReport || 10000        // How often do poll for report changes

    // Get order settings
    this.minWidthPercent = (this.conf.minWidthPercent || 0.2) / 100
    this.minWidthPercentIncrement = (this.conf.minWidthPercentIncrement || 0.1) / 100
    this.maxBullets = this.conf.maxBullets || 3
    this.orderSize = this.conf.orderSize || 0
    this.positionPlTarget = (this.conf.positionPlTarget || 1) / 100

    this.exchanges = false
    this.exchange = this.loadExchange()
    this.market = this.loadMarket()
    this.marketInfo = false
    this.markets = false
    this.marketsInfo = false

    this.asset = this.market.split('/')[0]
    this.currency = this.market.split('/')[1]

    this.started = false
    this.orderFair = false

    this.orders = []
    this.positions = []
    this.position = false

    this.assetBalance = false
    this.assetBalanceStart = false
    this.currencyBalance = false
    this.currencyBalanceConsolidated = false
    this.currencyBalanceConsolidatedDiff = false
    this.currencyBalanceConsolidatedStart = false
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

    this.thisInfo()       // Update the market prices and balance
    this.tickOrders()     // Update our orders
    this.tickReport()     // Update the report

    // Give the go ahead
    return true
  }

  async thisInfo () {
    try {
      let pl = (this.position ? this.position.pl : 0)

      // Load the price info
      let orderbook = await this.exchange.fetchOrderBook(this.market)
      this.bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
      this.ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
      this.fair = (this.bid + this.ask) / 2
      this.spread = (this.bid && this.ask) ? this.ask - this.bid : undefined
      this.spreadPercent = this.spread / this.bid

      // Load the balances for market
      let balance = await this.exchange.fetchBalance({ type: 'trading' })

      // Check if we have the start balance
      if (!this.started && this.bid) {
        // We saved start balance
        this.started = true

        // Save the balances
        this.assetBalanceStart = balance[this.asset] ? balance[this.asset].total : 0
        this.currencyBalanceStart = balance[this.currency] ? balance[this.currency].total : 0

        // Calculate consolidated balance
        this.assetBalanceConsolidatedStart = this.assetBalanceStart + this.currencyBalanceStart / this.ask
        this.currencyBalanceConsolidatedStart = this.currencyBalanceStart + this.assetBalanceStart * this.bid
      }

      // Save the balances
      this.assetBalance = balance[this.asset] ? balance[this.asset].total : 0
      this.currencyBalance = balance[this.currency] ? balance[this.currency].total : 0

      // Calculate consolidated balance
      this.assetBalanceConsolidated = this.assetBalance + ((this.currencyBalance + pl) / this.ask)
      this.assetBalanceConsolidatedBase = this.assetBalance + (this.currencyBalance / this.ask)
      this.assetBalanceConsolidatedDiff = (this.assetBalanceConsolidated - this.assetBalanceConsolidatedStart) / this.assetBalanceConsolidatedStart
      this.assetBalanceConsolidatedBaseDiff = (this.assetBalanceConsolidatedBase - this.assetBalanceConsolidatedStart) / this.assetBalanceConsolidatedStart
      this.currencyBalanceConsolidated = this.currencyBalance + pl + (this.assetBalance * this.bid)
      this.currencyBalanceConsolidatedBase = this.currencyBalance + (this.assetBalance * this.bid)
      this.currencyBalanceConsolidatedDiff = (this.currencyBalanceConsolidated - this.currencyBalanceConsolidatedStart) / this.currencyBalanceConsolidatedStart
      this.currencyBalanceConsolidatedBaseDiff = (this.currencyBalanceConsolidatedBase - this.currencyBalanceConsolidatedStart) / this.currencyBalanceConsolidatedStart
    } catch (e) {
      /* handle error */
      log.error(e)
    }

    setTimeout(() => { this.thisInfo() }, this.pollInfo) // rate limit
  }

  async tickOrders () {
    try {
      if (this.started) {
        // We need to save the new orders
        let newOrders = []

        // Load our positions and get our own position
        this.positions = await this.exchange.privatePostPositions()
        this.position = this.positions.filter((position) => {
          return position.symbol === this.market.replace('/', '').toLowerCase()
        })

        if (!this.position.length) {
          this.position = false
        }

        if (this.position) {
          // Save the current market position
          this.position = this.position[0]

          // Convert the floats into floats
          this.position.amount = parseFloat(this.position.amount)
          this.position.base = parseFloat(this.position.base)
          this.position.pl = parseFloat(this.position.pl)

          // are we long or short?
          this.position.long = this.position.amount > 0

          // Calculate the position %
          this.position.plp = this.position.pl / this.currencyBalanceConsolidatedBase

          // If pl acceptable, close the position
          if (this.position.plp >= this.positionPlTarget) {
            await this.exchange.privatePostOrderNew({
              symbol: this.market.replace('/', ''),
              amount: (this.position.long ? this.position.amount : this.position.amount * -1).toString(),
              price: (this.position.long ? this.bid : this.ask).toString(),
              exchange: 'bitfinex',
              side: this.position.long ? 'sell' : 'buy',
              type: 'limit',
              is_postonly: true
            })
          }
        }

        // Load current orders
        this.orders = await this.exchange.fetchOpenOrders(this.market)
        this.ordersBuy = this.orders.filter((order) => {
          return order.side === 'buy'
        })
        this.ordersSell = this.orders.filter((order) => {
          return order.side === 'sell'
        })

        // Check if we need to update orders
        if (
          this.orders.length &&
          (
            this.orders.length !== this.maxBullets * 2 ||
            this.ordersBuy.length !== this.maxBullets ||
            this.ordersSell.length !== this.maxBullets
          ) // Do we have a balanced order set?
        ) {
          await this.exchange.privatePostOrderCancelAll()
          this.orders = []
        }

        if (this.orders.length === 0) {
          let price = 0

          price = this.fair - this.fair * this.minWidthPercent

          if (this.bid < price) {
            price = this.bid
          }

          for (let i = 0, len = this.maxBullets; i < len; i++) {
            price -= price * this.minWidthPercentIncrement

            this.adjustOrderSize(price)

            newOrders.push({
              symbol: this.market.replace('/', ''),
              amount: this.orderSize.toString(),
              price: price.toString(),
              exchange: 'bitfinex',
              side: 'buy',
              type: 'limit',
              is_postonly: true
            })
          }

          price = this.fair + this.fair * this.minWidthPercent

          if (this.ask > price) {
            price = this.ask
          }

          for (let i = 0, len = this.maxBullets; i < len; i++) {
            price += price * this.minWidthPercentIncrement

            this.adjustOrderSize(price)

            newOrders.push({
              symbol: this.market.replace('/', ''),
              amount: this.orderSize.toString(),
              price: price.toString(),
              exchange: 'bitfinex',
              side: 'sell',
              type: 'limit',
              is_postonly: true
            })
          }

          await this.exchange.privatePostOrderNewMulti({ orders: newOrders })

          // Save the used fair
          this.orderFair = this.fair
        }
      }
    } catch (e) {
      /* handle error */
      log.error(e)
    }

    setTimeout(() => { this.tickOrders() }, this.pollOrders) // rate limit
  }

  async tickReport () {
    try {
      let plp = this.position ? this.position.plp : 0

      if (!this.started) {
        log.info(
          // Market flow
          '|', 'bid',
          '|', 'ask',
          '|', 'fair',
          '|', 'spread %',

          // Summary
          '|', 'start balance',
          '|', 'current balance',
          '|', 'profit/loss',
          '|', 'position p/l'
        )
      } else {
        log.info(
          // Market flow
          '|', fk(this.currency, this.bid).green,
          '|', fk(this.currency, this.ask).red,
          '|', fk(this.currency, this.fair).cyan,
          '|', fp(this.spreadPercent),

          // Summary
          '|', fk(this.currency, this.currencyBalanceConsolidatedStart).cyan,
          '|', fk(this.currency, this.currencyBalanceConsolidated).yellow,
          '|', fk(this.currency, this.currencyBalanceConsolidatedBase).magenta,
          '|', fp(this.currencyBalanceConsolidatedDiff),
          '|', fp(this.currencyBalanceConsolidatedBaseDiff),
          '|', fp(plp)
        )
      }
    } catch (e) {
      /* handle error */
      log.error(e)
    }

    setTimeout(() => { this.tickReport() }, this.pollReport) // rate limit
  }

  adjustOrderSize (price) {
    // Check order size
    if (this.orderSize < this.marketInfo.limits.amount.min) {
      // Reset to default
      this.orderSize = this.marketInfo.limits.amount.min
    }

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
