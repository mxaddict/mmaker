// libs
const log = require('./log')
const numbro = require('numbro')
// parts
const Cycler = require('./cycler')

module.exports = class Waiter extends Cycler {
  cycle () {
    (async () => {
      this.poll = this.engine.pollOrders || 2000
      this.exchange = this.engine.exchange
      this.market = this.engine.market
      let orderbook = await this.exchange.fetchOrderBook (this.market)
      let bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
      let ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
      let fair = (bid + ask) / 2
      let spread = (bid && ask) ? ask - bid : undefined
      let spreadPercent = spread / bid * 100

      // Save our findings
      this.engine.orderbook = orderbook
      this.engine.bid = bid
      this.engine.ask = ask
      this.engine.spread = spread

      log.n(this.exchange.id, 'market price', { bid, ask, spread , fair, spreadPercent })

      if (this.running) {
        setTimeout (() => {
          this.cycle()
        }, this.poll) // rate limit
      }
    }) ()
  }
}
