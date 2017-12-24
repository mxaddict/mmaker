// What is our config?
let conf = {
  exchange: 'bitfinex',
  market: 'BCH/BTC',
  minWidthPercent: 0.09,
  minWidthPercentIncrement: 0.1,
  maxBullets: 5,
  pollInfo: 5000,
  pollOrders: 5000,
  pollReport: 5000,
  positionPlTarget: 5,
  bitfinex: {
    apiKey: '', // You know what this is?
    secret: ''  // If you don't please leave!
  },
}

module.exports = conf

