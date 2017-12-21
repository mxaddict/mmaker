const log = require('./log')

module.exports = class Cycler {
  constructor () {
    this.run = false
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
    log.error(`Method "${this.cycle.name}" not implemented in class "${this.constructor.name}"`)
    this.stop()
  }
}
