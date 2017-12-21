// libs
const log = require('./log')
// parts
const Cycler = require('./cycler')

module.exports = class Cook extends Cycler {
  cycle () {
    log.warning('Cook cycle')
    this.stop()
  }
}
