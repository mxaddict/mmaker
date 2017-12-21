const log = require('./log')
const Cycler = require('./cycler')

module.exports = class Waiter extends Cycler {
  cycle () {
    log.n('waiter cycle')
    this.stop()
  }
}
