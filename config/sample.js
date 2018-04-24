// What is our config?
let conf = {
  exchange: 'binance',
  market: 'NAV/BTC',

  // Get the poll settings
  pollInfo: 8000,
  pollOrders: 8000,
  pollReport: 5000,

  // Get order settings
  adjustSpread: true,
  minWidthPercent: 0.5,
  minWidthPercentIncrement: 0.3,
  orderCountBuy: 4,
  orderCountBuyMin: 2,
  orderCountSell: 4,
  orderCountSellMin: 2,
  orderSize: 0, // ZERO = AUTO USES orderSizeMultiplier * accountBalance
  orderSizeMultiplier: 2.5,
  positionTarget: 1,
  saveReport: true,

  binance: {
    apiKey: '', // You know what this is?
    secret: ''  // If you don't please leave!
  }
}

module.exports = conf
