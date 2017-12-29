// libs
const ccxt = require('ccxt')
const color = require('ansicolor').nice
const config = require('config')
const jsonfile = require('jsonfile')
const olog = require('ololog').configure({ locate: false, time: true })
const log = olog.configure({ time: { print: x => (`${x.toLocaleDateString('en-us')} ${x.toLocaleTimeString('en-us')} | `).bright.cyan } })
const numbro = require('numbro')
const table = require('as-table').configure({ title: x => x.darkGray, delimiter: ' | '.dim.cyan, dash: '-'.bright.cyan })

// Make some shorthands for numbro
function fk (value) {
  return numbro(value).format('0,0[.]00000000')
    .replace(/0/g, '0'.darkGray)
}
function fkl (value) {
  let format = '+0,0[.]00000000'
  if (value < 0) {
    return numbro(value).format(format).red
  } else if (value > 0) {
    return numbro(value).format(format).green
  }

  return numbro(value).format(format).darkGray
}
function fp (value) {
  let format = '+00.00%'
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

    // Load our conf values
    this.loadConf()

    this.exchanges = false
    this.marketInfo = false
    this.markets = false
    this.marketsInfo = false

    this.asset = this.market.split('/')[0]
    this.currency = this.market.split('/')[1]

    this.started = false
    this.orderFair = false

    this.orders = []
    this.ordersBuy = []
    this.ordersSell = []
    this.positions = []
    this.position = false

    this.profitOrder = false

    this.assetBalance = false
    this.assetBalanceStart = false
    this.currencyBalance = false
    this.currencyBalanceConsolidated = false
    this.currencyBalanceConsolidatedDiff = false
    this.currencyBalanceConsolidatedStart = false
    this.currencyBalanceStart = false
  }

  async start () {
    // Check for USD
    if (['USD', 'USDT'].includes(this.currency)) {
      log.bright.red.error(`CURRENCY ${this.currency} is NOT ALLOWED!`)
      return false
    }

    // Check exchange
    if (!ccxt.exchanges.includes(this.exchange)) {
      log.bright.red.error(`Exchange "${this.exchange}" is not supported YET`)
      return false
    }

    // Load the exchange
    log.cyan(`Using Exchange "${this.exchange}"`)
    this.exchange = new ccxt[this.exchange](config.get(this.exchange))

    // Save the markets and marketsInfo
    this.marketsInfo = await this.exchange.loadMarkets()
    this.markets = Object.keys(this.marketsInfo)

    // Check if we selected a market/pair that is valid
    if (!this.markets.includes(this.market)) {
      log.bright.red.error(`Market "${this.market}" is not supported YET`)
      return false
    }

    // Save the marketInfo
    log.cyan(`Using Market "${this.market}"`)
    this.marketInfo = this.marketsInfo[this.market]

    this.tickInfo()       // Update the market prices and balance
    this.tickOrders()     // Update our orders
    this.tickReport()     // Update the report

    // Give the go ahead
    return true
  }

  async tickInfo () {
    try {
      let pl = (this.position ? this.position.pl : 0)

      // Load the price info
      let orderbook = await this.exchange.fetchOrderBook(this.market)
      this.bid = orderbook.bids.length ? orderbook.bids[0][0] : false
      this.ask = orderbook.asks.length ? orderbook.asks[0][0] : false
      this.fair = (this.bid + this.ask) / 2
      this.spread = (this.bid && this.ask) ? this.ask - this.bid : false
      this.spreadPercent = this.spread / this.bid

      // Load the balances for market
      let balance = await this.exchange.fetchBalance({ type: 'trading' })

      // Check if we have the start balance
      if (!this.started && this.bid) {
        // We saved start balance
        this.started = true

        // Where is our balance cache?
        let balanceFile = 'balance.json'
        let balanceCache = false

        try {
          // Try to load the start balance from cache
          balanceCache = jsonfile.readFileSync(balanceFile)
        } catch (e) {
          // Could not load balance
        }

        // Save the values
        this.assetBalanceStart = balance[this.asset] ? balance[this.asset].total : 0
        this.currencyBalanceStart = balance[this.currency] ? balance[this.currency].total : 0
        this.currencyBalanceConsolidatedStart = this.currencyBalanceStart + this.assetBalanceStart * this.bid

        // Check if we need a profit reset?
        if (this.argv.reset_profit || !balanceCache.total || !balanceCache.consolidated) {
          balanceCache = {
            total: this.currencyBalanceStart,
            consolidated: this.currencyBalanceConsolidatedStart
          }

          try {
            // Save these for later
            jsonfile.writeFileSync(balanceFile, balanceCache)
          } catch (e) {
            log.bright.red.error(`Error saving "${balanceFile}"`, e)
          }
        } else {
          // Log that we loaded the cache
          log.cyan(`Loaded balance from "${balanceFile}"`)

          // Load from conf
          this.assetBalanceStart = 0
          this.currencyBalanceStart = balanceCache ? balanceCache.total : 0
          this.currencyBalanceConsolidatedStart = balanceCache ? balanceCache.consolidated : 0
        }
      }

      // Save the balances
      this.assetBalance = balance[this.asset] ? balance[this.asset].total : 0
      this.currencyBalance = balance[this.currency] ? balance[this.currency].total : 0

      // Calculate consolidated balance
      this.currencyBalanceConsolidated = this.currencyBalance + pl + (this.assetBalance * this.bid)
      this.currencyBalanceConsolidatedBase = this.currencyBalance + (this.assetBalance * this.bid)
      this.currencyBalanceConsolidatedDiff = (this.currencyBalanceConsolidated - this.currencyBalanceConsolidatedStart) / this.currencyBalanceConsolidatedStart
      this.currencyBalanceConsolidatedBaseDiff = (this.currencyBalanceConsolidatedBase - this.currencyBalanceConsolidatedStart) / this.currencyBalanceConsolidatedStart
    } catch (e) {
      /* handle error */
      log.bright.red.error(e)
    }

    setTimeout(() => { this.tickInfo() }, this.pollInfo) // rate limit
  }

  async tickOrders () {
    try {
      if (this.started && !this.running) {
        // We are running
        this.running = false

        // We need to save the new orders
        let newOrdersBuy = []
        let newOrdersSell = []
        let price = 0

        // Load current orders
        this.orders = await this.exchange.fetchOpenOrders(this.market)
        this.ordersBuy = this.orders.filter((order) => {
          return order.side === 'buy'
        })
        this.ordersSell = this.orders.filter((order) => {
          return order.side === 'sell'
        })

        // Load our positions and get our own position
        this.positions = await this.exchange.privatePostPositions()
        this.position = this.positions.filter((position) => {
          return position.symbol === this.market.replace('/', '').toLowerCase()
        })

        if (!this.position.length) {
          this.position = false
        } else {
          // Save the current market position
          this.position = this.position[0]
        }

        // Calculate our orderCountMod
        let orderCountModBuy = 0
        let orderCountModSell = 0

        if (this.profitOrder) {
          orderCountModBuy  = this.position.long ? 0 : 1
          orderCountModSell = this.position.long ? 1 : 0
        }

        // Check if we need to update orders
        if (
          this.orders.length &&
          (
            this.orders.length > (this.orderCountBuy + this.orderCountSell + orderCountModBuy + orderCountModSell) ||
            this.ordersBuy.length < this.orderCountBuyMin + orderCountModBuy ||
            this.ordersSell.length < this.orderCountSellMin + orderCountModSell
          ) // Do we have a balanced order set?
        ) {
          await this.exchange.privatePostOrderCancelMulti({ order_ids: this.orders.map((order) => {
            return order.id
          })})
          this.orders = []
        }

        if (this.position) {
          // Convert the floats into floats
          this.position.amount = parseFloat(this.position.amount)
          this.position.base = parseFloat(this.position.base)
          this.position.pl = parseFloat(this.position.pl)

          // are we long or short?
          this.position.long = this.position.amount > 0

          // Calculate the position %
          this.position.plp = this.position.pl / this.currencyBalanceConsolidatedBase

          let amount = this.position.long ? this.position.amount : this.position.amount * -1

          // Check if amount is feasable
          if (amount < this.marketInfo.limits.amount.min) {
            // Reset to default
            amount = this.marketInfo.limits.amount.min
          }

          this.profitOrder = false

          if (this.position.plp >= this.positionTarget / 100) {
            // Calculate the price
            price = (this.position.long ? this.ask: this.bid)

            this.profitOrder = {
              symbol: this.market.replace('/', ''),
              amount: amount.toString(),
              price: price.toString(),
              exchange: 'bitfinex',
              side: (this.position.long ? 'sell' : 'buy'),
              type: 'limit',
              is_postonly: true
            }

            if (this.position.long) {
              // Add the order
              newOrdersSell.push(this.profitOrder)
            } else {
              // Add the order
              newOrdersBuy.push(this.profitOrder)
            }
          }
        }

        if (this.orders.length === 0) {

          price = this.fair - (this.fair * this.minWidthPercent / 2)

          if (this.adjustSpread && this.bid < price) {
            price = this.bid
          }

          for (let i = 0, len = this.orderCountBuy; i < len; i++) {
            price -= price * this.minWidthPercentIncrement

            this.adjustOrderSize(price)

            newOrdersBuy.push({
              symbol: this.market.replace('/', ''),
              amount: this.orderSize.toString(),
              price: price.toString(),
              exchange: 'bitfinex',
              side: 'buy',
              type: 'limit',
              is_postonly: true
            })
          }

          price = this.fair + (this.fair * this.minWidthPercent / 2)

          if (this.adjustSpread && this.ask > price) {
            price = this.ask
          }

          for (let i = 0, len = this.orderCountSell; i < len; i++) {
            price += price * this.minWidthPercentIncrement

            this.adjustOrderSize(price)

            newOrdersSell.push({
              symbol: this.market.replace('/', ''),
              amount: this.orderSize.toString(),
              price: price.toString(),
              exchange: 'bitfinex',
              side: 'sell',
              type: 'limit',
              is_postonly: true
            })
          }

          try {
            let orders = []
            if (this.position && this.position.long) {
              orders = newOrdersSell.concat(newOrdersBuy)
            } else {
              orders = newOrdersBuy.concat(newOrdersSell)
            }

            // Max orders allowed by exchange
            let chunks = 10

            for (var i = 0, len = orders.length; i < len; i+=chunks) {
              await this.exchange.privatePostOrderNewMulti({ orders: orders.slice(i, i+chunks) })
            }
          } catch (e) {
            /* handle error */
          }

          // Save the used fair
          this.orderFair = this.fair
        }
      }
    } catch (e) {
      /* handle error */
      log.bright.red.error(e)
    }

    this.running = false

    setTimeout(() => { this.tickOrders() }, this.pollOrders) // rate limit
  }

  async tickReport () {
    try {
      if (this.started) {
        let plp = this.position ? this.position.plp : 0
        let pamount = this.position ? this.position.amount : 0
        let ptype = this.position ? (this.position.long ? 'long'.green : 'short'.red) : 'none'.darkGray

        // Check if we want to save the report
        if (this.saveReport) {
          // Where do we save the report?
          let reportFile = 'public/report.json'

          try {
            let report = {
              balance: {
                start: this.currencyBalanceConsolidatedStart,
                consolidated: this.currencyBalanceConsolidated,
                current: this.currencyBalanceConsolidatedBase
              },

              asset: this.asset,
              currency: this.currency,

              bid: this.bid,
              ask: this.ask,
              fair: this.fair,
              spread: this.spread,

              position: this.position,
              orders: this.orders
            }

            // Save these for later
            jsonfile.writeFileSync(reportFile, report)
          } catch (e) {
            log.bright.red.error(`Error saving "${reportFile}"`, e)
          }
        }

        log(table([{
          // Market flow
          'price bid/ask/fair/spread %': [ this.currency, [
            fk(this.bid).green,
            fk(this.ask).red,
            fk(this.fair).cyan,
            fp(this.spreadPercent)
          ].join('/')].join(' '),

          // Balance
          'balance start/current/+pl': [ this.currency, [
            fk(this.currencyBalanceConsolidatedStart).cyan,
            fk(this.currencyBalanceConsolidatedBase).magenta,
            fk(this.currencyBalanceConsolidated).yellow
          ].join('/')].join(' '),

          // Profit Loss
          'profit/loss value/%/%consolidated': [ this.currency, [
            fkl(this.currencyBalanceConsolidatedBase - this.currencyBalanceConsolidatedStart),
            fp(this.currencyBalanceConsolidatedBaseDiff),
            fp(this.currencyBalanceConsolidatedDiff)
          ].join('/')].join(' '),

          // Position stats
          'position pl%/type/amount': [
            fp(plp),
            ptype,
            `${this.asset} ${fkl(pamount)}`.yellow
          ].join('/'),

          // Order stats
          'orders size/buy/sell': [
            `${this.asset} ${fk(this.orderSize)}`.cyan,
            `${this.ordersBuy.length}`.green,
            `${this.ordersSell.length}`.red
          ].join('/')
        }]))
      }
    } catch (e) {
      /* handle error */
      log.bright.red.error(e)
    }

    setTimeout(() => { this.tickReport() }, this.pollReport) // rate limit
  }

  adjustOrderSize (price) {
    // Calculate the orderSize
    this.orderSize = this.currencyBalanceConsolidatedBase * this.orderSizeMultiplier / this.fair

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

  loadConf () {
    try {
      // What???
      this.exchange = config.get('exchange')
      this.market = config.get('market')

      // Get the poll settings
      this.pollInfo = config.get('pollInfo')      // How often do poll for price and balance changes
      this.pollOrders = config.get('pollOrders')  // How often do poll for order changes
      this.pollReport = config.get('pollReport')  // How often do poll for report changes

      // Get order settings
      this.adjustSpread = config.get('adjustSpread')
      this.minWidthPercent = config.get('minWidthPercent') / 100
      this.minWidthPercentIncrement = config.get('minWidthPercentIncrement') / 100
      this.orderCountBuy = config.get('orderCountBuy')
      this.orderCountBuyMin = config.get('orderCountBuyMin')
      this.orderCountSell = config.get('orderCountSell')
      this.orderCountSellMin = config.get('orderCountSellMin')
      this.orderSize = config.get('orderSize')
      this.orderSizeMultiplier = config.get('orderSizeMultiplier')
      this.positionTarget = config.get('positionTarget')

      // Do we save the report?
      this.saveReport = config.get('saveReport') || true
    } catch (e) {
      /* handle error */
      log.bright.red.error(e)
    }
  }
}
