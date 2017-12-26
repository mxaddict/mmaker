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
  minWidthPercent: 0.12,
  minWidthPercentIncrement: 0.1,
  orderSize: 0, // ZERO = AUTO
  orderSizeMultiplier: 0.05,
  orderCountBuy: 5,
  orderCountBuyMin: 2,
  orderCountSell: 5,
  orderCountSellMin: 2,
  positionPlTarget: 5,
  saveReport: true,

  bitfinex: {
    apiKey: '', // You know what this is?
    secret: ''  // If you don't please leave!
  }
}

module.exports = conf
