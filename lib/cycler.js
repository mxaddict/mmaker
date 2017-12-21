const log = require('./log')

module.exports = class Cycler {
  constructor (start = false) {
    this.run = false

    if (start) {
      this.start()
    }
  }

  start () {
    this.run = true
    while (this.run) {
      this.cycle()
    }
  }

  stop () {
    this.run = false
  }

  cycle () {
    log(`ERROR: Cycle not implemented in ${__filename}`)
    this.stop()
  }
}
