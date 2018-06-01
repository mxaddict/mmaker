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
  let format = '+0,0[.]00000000'

  // Check if we need less decimals
  if (value > 1) {
    format = '+0,0[.]00'
  }
  return numbro(value).format(format)
    .replace(/0/g, '0'.darkGray)
}
function fkl (value) {
  let format = '+0,0[.]00000000'

  // Check if we need less decimals
  if (value > 1) {
    format = '+0,0[.]00'
  }

  let _return = numbro(value).format(format)
    .replace(/0/g, '0'.darkGray)

  if (value < 0) {
    _return = _return.red
  } else if (value > 0) {
    _return = _return.green
  }

  return _return
}
function fp (value) {
  let format = '+00.000%'
  let _return = numbro(value).format(format)
    .replace(/0/g, '0'.darkGray)

  if (value < 0) {
    _return = _return.red
  } else if (value > 0) {
    _return = _return.green
  }

  return _return
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

    this.orders = []
    this.ordersBuy = []
    this.ordersSell = []

    this.assetBalance = false
    this.assetBalanceStart = false
    this.currencyBalance = false
    this.currencyBalanceConsolidated = false
    this.currencyBalanceConsolidatedStart = false
    this.currencyBalanceStart = false
  }

  async start () {
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

    this.tickInfo() // Update the market prices and balance
    this.tickOrders() // Update our orders
    this.tickReport() // Update the report

    // Give the go ahead
    return true
  }

  async tickInfo () {
    try {
      // Load the price info
      let orderbook = await this.exchange.fetchOrderBook(this.market)
      this.bid = orderbook.bids.length ? orderbook.bids[0][0] : false
      this.ask = orderbook.asks.length ? orderbook.asks[0][0] : false
      this.fair = (this.bid + this.ask) / 2
      this.spread = (this.bid && this.ask) ? this.ask - this.bid : false
      this.spreadPercent = this.spread / this.bid

      // Load the balances for market
      let balance = await this.exchange.fetchBalance()

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
        this.assetBalanceConsolidatedStart = this.assetBalanceStart + this.currencyBalanceStart / this.ask
        this.currencyBalanceConsolidatedStart = this.currencyBalanceStart + this.assetBalanceStart * this.bid

        // Check if we need a profit reset?
        if (
          this.argv.reset_profit ||
          !balanceCache[this.asset] ||
          !balanceCache[this.asset].total ||
          !balanceCache[this.asset].consolidated ||
          !balanceCache[this.currency] ||
          !balanceCache[this.currency].total ||
          !balanceCache[this.currency].consolidated
        ) {
          balanceCache = {}
          balanceCache[this.asset] = {
            total: this.assetBalanceStart,
            consolidated: this.assetBalanceConsolidatedStart
          }
          balanceCache[this.currency] = {
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
          this.assetBalanceStart = balanceCache[this.asset] ? balanceCache[this.asset].total : 0
          this.currencyBalanceStart = balanceCache[this.currency] ? balanceCache[this.currency].total : 0
          this.assetBalanceConsolidatedStart = balanceCache[this.asset] ? balanceCache[this.asset].consolidated : 0
          this.currencyBalanceConsolidatedStart = balanceCache[this.currency] ? balanceCache[this.currency].consolidated : 0
        }
      }

      // Save the balances
      this.assetBalance = balance[this.asset] ? balance[this.asset].total : 0
      this.currencyBalance = balance[this.currency] ? balance[this.currency].total : 0

      // Check if we want aggressive profit calculation
      if (this.aggressive) {
        // Calculate the start balances at current prices
        this.assetBalanceConsolidatedStart = this.assetBalanceStart ? this.assetBalanceStart + (this.currencyBalanceStart / this.ask) : 0
        this.currencyBalanceConsolidatedStart = this.currencyBalanceStart ? this.currencyBalanceStart + (this.assetBalanceStart * this.bid) : 0
      }

      // Calculate consolidated balance
      this.assetBalanceConsolidated = this.assetBalance + (this.currencyBalance / this.ask)
      this.assetBalanceConsolidatedDiff = (this.assetBalanceConsolidated - this.assetBalanceConsolidatedStart) / this.assetBalanceConsolidatedStart
      this.currencyBalanceConsolidated = this.currencyBalance + (this.assetBalance * this.bid)
      this.currencyBalanceConsolidatedDiff = (this.currencyBalanceConsolidated - this.currencyBalanceConsolidatedStart) / this.currencyBalanceConsolidatedStart
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
        this.running = true

        // Some values we need to track later
        let price = 0
        let newOrdersBuy = []
        let newOrdersSell = []

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
            this.orders.length > (this.orderCountBuy + this.orderCountSell) ||
            this.orders.length < this.orderCountMin ||
            this.ordersBuy.length < this.orderCountBuyMin ||
            this.ordersSell.length < this.orderCountSellMin
          ) // Do we have a balanced order set?
        ) {
          try {
            // Get the orderIds
            let orderIds = this.orders.map((order) => {
              return order.id
            })

            for (let i = 0, len = orderIds.length; i < len; i++) {
              await this.exchange.cancelOrder(orderIds[i], this.market)
            }
          } catch (e) {
            /* handle error */
            log.bright.red.error(e)
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
              symbol: this.market,
              amount: this.orderSize.toString(),
              price: price.toString(),
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
              symbol: this.market,
              amount: this.orderSize.toString(),
              price: price.toString(),
              side: 'sell',
              type: 'limit',
              is_postonly: true
            })
          }

          // Calculate total currency needed for buy orders
          let currencyNeeded = newOrdersBuy.reduce((currency, order) => {
            return currency + parseFloat(order.amount) * parseFloat(order.price)
          }, 0)

          // Calculate total asset needed for sell orders
          let assetNeeded = newOrdersBuy.reduce((asset, order) => {
            return asset + parseFloat(order.amount)
          }, 0)

          // Check if we need to sell some assets
          if (this.currencyBalance < currencyNeeded) {
            // Calculate how much we need to sell
            let assetToSell = (currencyNeeded - this.currencyBalance) / this.ask

            // Check if we meet the minimum
            if (assetToSell < this.marketInfo.limits.amount.min) {
              assetToSell = this.marketInfo.limits.amount.min
            }

            // Run the order
            await this.exchange.createOrder(this.market, 'market', 'sell', assetToSell * 1.01)
          }

          // Check if we need to buy some assets
          if (this.assetBalance < assetNeeded) {
            // Calculate how much we need to sell
            let assetToBuy = (assetNeeded - this.assetBalance)

            // Check if we meet the minimum
            if (assetToBuy < this.marketInfo.limits.amount.min) {
              assetToBuy = this.marketInfo.limits.amount.min
            }

            // Run the order
            await this.exchange.createOrder(this.market, 'market', 'buy', assetToBuy * 1.01)
          }

          // Temp orders array
          let orders = []

          // Loop our new orders
          for (let i = 0, len = Math.ceil((newOrdersBuy.length + newOrdersSell.length) / 2); i < len; i++) {
            if (typeof newOrdersBuy[i] !== 'undefined') {
              orders.push(newOrdersBuy[i])
            }
            if (typeof newOrdersSell[i] !== 'undefined') {
              orders.push(newOrdersSell[i])
            }
          }

          for (let i = 0, len = orders.length; i < len; i++) {
            try {
              await this.exchange.createOrder(orders[i].symbol, orders[i].type, orders[i].side, orders[i].amount, orders[i].price)
            } catch (e) {
              /* handle error */
              log.bright.red.error(e)
            }
          }
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
        // Check if we want to save the report
        if (this.saveReport) {
          // Where do we save the report?
          let reportFile = 'public/report.json'

          try {
            let balance = {}
            balance[this.asset] = {
              total: this.assetBalanceConsolidatedStart,
              consolidated: this.assetBalanceConsolidated,
              profit: this.assetBalanceConsolidatedStart - this.assetBalanceConsolidated
            }

            balance[this.currency] = {
              total: this.currencyBalanceConsolidatedStart,
              consolidated: this.currencyBalanceConsolidated,
              profit: this.currencyBalanceConsolidatedStart - this.currencyBalanceConsolidated
            }

            let report = {
              balance: balance,

              asset: this.asset,
              currency: this.currency,

              bid: this.bid,
              ask: this.ask,
              fair: this.fair,
              spread: this.spread,

              orders: {
                buy: this.orders ? this.ordersBuy.length : 0,
                sell: this.orders ? this.ordersSell.length : 0
              }
            }

            // Save these for later
            jsonfile.writeFileSync(reportFile, report)
          } catch (e) {
            log.bright.red.error(`Error saving "${reportFile}"`, e)
          }
        }

        log(table([{
          // Market flow
          'price bid/ask/spread %': [ this.currency, [
            fk(this.bid).green,
            fk(this.ask).red,
            fp(this.spreadPercent)
          ].join('/')].join(' '),

          // asset balance
          'asset balance start/current': [ this.asset, [
            fk(this.assetBalanceConsolidatedStart).cyan,
            fk(this.assetBalanceConsolidated).magenta
          ].join('/')].join(' '),

          // currency balance
          'currency start/current': [ this.currency, [
            fk(this.currencyBalanceConsolidatedStart).cyan,
            fk(this.currencyBalanceConsolidated).magenta
          ].join('/')].join(' '),

          // asset profit/loss
          'asset p/l value/%': [ this.asset, [
            fkl(this.assetBalanceConsolidated - this.assetBalanceConsolidatedStart),
            fp(this.assetBalanceConsolidatedDiff)
          ].join('/')].join(' '),

          // currency profit/loss
          'currency p/l value/%': [ this.currency, [
            fkl(this.currencyBalanceConsolidated - this.currencyBalanceConsolidatedStart),
            fp(this.currencyBalanceConsolidatedDiff)
          ].join('/')].join(' '),

          // overall profit/loss
          'overall p/l %': [ [ this.asset, this.currency ].join('/'), [
            fp((this.assetBalanceConsolidatedDiff + this.currencyBalanceConsolidatedDiff) / 2)
          ].join('/')].join(' '),

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
    if (this.orderSizeAuto) {
      // Calculate the orderSize
      this.orderSize = this.currencyBalanceConsolidated * this.orderSizeMultiplier / this.fair
    }

    // Check order size
    if (this.orderSize < this.marketInfo.limits.amount.min) {
      // Reset to default
      this.orderSize = this.marketInfo.limits.amount.min
    }

    // Check if we even have a COST limit
    if (this.marketInfo.limits.cost) {
      // Check order cost
      if (this.orderSize * price < this.marketInfo.limits.cost.min) {
        this.orderSize = this.marketInfo.limits.cost.min / price * 1.1
      }
    }
  }

  loadConf () {
    try {
      // What???
      this.exchange = config.get('exchange')
      this.market = config.get('market')

      // Get the poll settings
      this.pollInfo = config.get('pollInfo') // How often do poll for price and balance changes
      this.pollOrders = config.get('pollOrders') // How often do poll for order changes
      this.pollReport = config.get('pollReport') // How often do poll for report changes

      // Do we need to aggressively calculate profit?
      this.aggressive = config.get('aggressive')

      // Get order settings
      this.adjustSpread = config.get('adjustSpread')
      this.minWidthPercent = config.get('minWidthPercent') / 100
      this.minWidthPercentIncrement = config.get('minWidthPercentIncrement') / 100
      this.orderCountMin = config.get('orderCountMin')
      this.orderCountBuy = config.get('orderCountBuy')
      this.orderCountBuyMin = config.get('orderCountBuyMin')
      this.orderCountSell = config.get('orderCountSell')
      this.orderCountSellMin = config.get('orderCountSellMin')
      this.orderSize = config.get('orderSize')
      this.orderSizeAuto = config.get('orderSize') === 0
      this.orderSizeMultiplier = config.get('orderSizeMultiplier') / 100

      // Do we save the report?
      this.saveReport = config.get('saveReport') || true
    } catch (e) {
      /* handle error */
      log.bright.red.error(e)
    }
  }
}
