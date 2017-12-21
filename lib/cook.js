// libs
const log = require('./log')
// parts
const Cycler = require('./cycler')

module.exports = class Cook extends Cycler {
  cycle () {
    log.n(log.info('Cook cycle'))
    this.stop()
  }
}
