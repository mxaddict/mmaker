let log = console.log
let chalk = require('chalk')

module.exports = {
  c: chalk,
  n: (...args) => {
    log.apply(null, args)
  },
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
