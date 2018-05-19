// What is our config?
let conf = {
  exchange: 'binance',
  market: 'NAV/BTC',

  // Get the poll settings
  pollInfo: 2500,
  pollOrders: 2500,
  pollReport: 2500,

  // Get order settings
  adjustSpread: true,
  minWidthPercent: 0.3,
  minWidthPercentIncrement: 0.2,
  orderCountMin: 7,
  orderCountBuy: 5,
  orderCountBuyMin: 3,
  orderCountSell: 5,
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
