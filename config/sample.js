// What is our config?
let conf = {
  exchange: 'bitfinex',
  market: 'XRP/BTC',

  // Get the poll settings
  pollInfo: 8000,
  pollOrders: 8000,
  pollReport: 5000,

  // Get order settings
  adjustSpread: true,
  minWidthPercent: 0.8,
  minWidthPercentIncrement: 0.3,
  orderCountBuy: 5,
  orderCountBuyMin: 1,
  orderCountSell: 5,
  orderCountSellMin: 1,
  orderSize: 0, // ZERO = AUTO
  orderSizeMultiplier: 0.1,
  positionTarget: 1,
  positionTargetMarket: true,
  saveReport: true,

  bitfinex: {
    apiKey: '', // You know what this is?
    secret: ''  // If you don't please leave!
  }
}

module.exports = conf
