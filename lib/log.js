let log = console.log
let chalk = require('chalk')

function Log () {
}

// n is just for normal output
Log.prototype.c = chalk

// n is just for normal output
Log.prototype.n = (...args) => {
  log.apply(null, args)
}

// These are our common formats
// NAMELY: dull, error, warning, info and success
// CAPS versions are for bold output
Log.prototype.dull = (...args) => {
  return chalk.grey.apply(null, args)
}

Log.prototype.DULL = (...args) => {
  return chalk.bold.grey.apply(null, args)
}

Log.prototype.error = (...args) => {
  return chalk.red.apply(null, args)
}

Log.prototype.ERROR = (...args) => {
  return chalk.bold.red.apply(null, args)
}

Log.prototype.warning = (...args) => {
  return chalk.keyword('orange').apply(null, args)
}

Log.prototype.WARNING = (...args) => {
  return chalk.bold.keyword('orange').apply(null, args)
}

Log.prototype.info = (...args) => {
  return chalk.cyan.apply(null, args)
}

Log.prototype.INFO = (...args) => {
  return chalk.bold.cyan.apply(null, args)
}

Log.prototype.success = (...args) => {
  return chalk.green.apply(null, args)
}

Log.prototype.SUCCESS = (...args) => {
  return chalk.bold.green.apply(null, args)
}

// We need some common krypto formats
Log.prototype.k = (symbol, value, style = chalk.yellow, styleDull = chalk.grey) => {
  // Pad it then Split it!
  value = `${value}`.padEnd(10, '0').split('')

  for (var i = 0, len = value.length; i < len; i++) {
    // check if we have a non 0 value
    if (value[i] !== '0') {
      value[i] = style(value[i])
    } else {
      value[i] = styleDull(value[i])
    }
  }

  return chalk.reset(`${value.join('')} ${symbol}`)
}

module.exports = new Log()
