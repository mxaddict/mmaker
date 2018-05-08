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
  minWidthPercent: 0.4,
  minWidthPercentIncrement: 0.3,
  orderCountMin: 8,
  orderCountBuy: 7,
  orderCountBuyMin: 3,
  orderCountSell: 7,
  orderCountSellMin: 3,
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
