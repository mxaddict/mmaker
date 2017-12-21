// libs
const log = require('./log')
// parts
const Cycler = require('./cycler')

module.exports = class Waiter extends Cycler {
  cycle () {
    log.n(log.info('Waiter cycle'))
    this.stop()
  }
}
