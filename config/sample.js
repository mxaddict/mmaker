// What is our config?
let conf = {
  exchange: 'binance',
  market: 'NAV/BTC',

  // Get the poll settings
  pollInfo: 5000,
  pollOrders: 5000,
  pollReport: 5000,

  // Get order settings
  adjustSpread: true,
  minWidthPercent: 0.6,
  minWidthPercentIncrement: 0.4,
  orderCountBuy: 5,
  orderCountBuyMin: 2,
  orderCountSell: 5,
  orderCountSellMin: 2,
  orderSize: 0, // ZERO = AUTO USES orderSizeMultiplier * accountBalance
  orderSizeMultiplier: 4, // 0 - 100 % possible values
  saveReport: true, // Saves a report file in ./public/report.json

  binance: {
    apiKey: '', // You know what this is?
    secret: ''  // If you don't please leave!
  }
}

module.exports = conf
