let log = console.log
let chalk = require('chalk')

module.exports = {
  // We need some common krypto formats
  k: (symbol, value, style = chalk.yellow, styleDull = chalk.grey) => {
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

    return `${value.join('')} ${symbol}`
  },

  // Maybe we need chalk later
  c: chalk,

  // n is just for normal output
  n: (...args) => {
    log.apply(null, args)
  },

  // These are our common formats
  // NAMELY: dull, error, warning, info and success
  // CAPS versions are for bold output
  dull: (...args) => {
    log(chalk.grey.apply(null, args))
  },
  DULL: (...args) => {
    log(chalk.grey.apply(null, args))
  },
  error: (...args) => {
    log(chalk.red.apply(null, args))
  },
  ERROR: (...args) => {
    log(chalk.bold.red.apply(null, args))
  },
  warning: (...args) => {
    log(chalk.keyword('orange').apply(null, args))
  },
  WARNING: (...args) => {
    log(chalk.bold.keyword('orange').apply(null, args))
  },
  info: (...args) => {
    log(chalk.cyan.apply(null, args))
  },
  INFO: (...args) => {
    log(chalk.bold.cyan.apply(null, args))
  },
  success: (...args) => {
    log(chalk.green.apply(null, args))
  },
  SUCCESS: (...args) => {
    log(chalk.bold.green.apply(null, args))
  }
}
