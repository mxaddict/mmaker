// What is our config?
let conf = {
  exchange: 'binance',
  market: 'NAV/BTC',

  // Get the poll settings
  pollInfo: 1000,
  pollOrders: 1000,
  pollReport: 1000,

  // Get order settings
  adjustSpread: false,
  minWidthPercent: 0.3,
  minWidthPercentIncrement: 0.3,
  orderCountMin: 5,
  orderCountBuy: 3,
  orderCountBuyMin: 2,
  orderCountSell: 3,
  orderCountSellMin: 2,
  orderSize: 0, // ZERO = AUTO USES orderSizeMultiplier * accountBalance
  orderSizeMultiplier: 1, // 0 - 100 % possible values
  saveReport: true, // Saves a report file in ./public/report.json
  aggressive: true, // Calculate the profit/loss aggressively?

  binance: {
    apiKey: '', // You know what this is?
    secret: ''  // If you don't please leave!
  }
}

module.exports = conf
