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
  minWidthPercent: 0.3,
  minWidthPercentIncrement: 0.15,
  orderCountBuy: 5,
  orderCountBuyMin: 5,
  orderCountSell: 5,
  orderCountSellMin: 5,
  orderSize: 0, // ZERO = AUTO
  orderSizeMultiplier: 0.1,
  positionTarget: 1,
  saveReport: true,

  bitfinex: {
    apiKey: '', // You know what this is?
    secret: ''  // If you don't please leave!
  }
}

module.exports = conf
