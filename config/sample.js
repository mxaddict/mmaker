// What is our config?
let conf = {
  exchange: 'bitfinex',
  market: 'BCH/BTC',

  // Get the poll settings
  pollInfo: 5000,
  pollOrders: 5000,
  pollReport: 5000,

  // Get order settings
  adjustSpread: true,
  maxBullets: 5,
  minWidthPercent: 0.15,
  minWidthPercentIncrement: 0.1,
  orderSize: 0, // ZERO = AUTO
  orderSizeMultiplier: 0.08,
  positionPlTarget: 5,
  saveReport: true,

  bitfinex: {
    apiKey: '', // You know what this is?
    secret: ''  // If you don't please leave!
  }
}

module.exports = conf
