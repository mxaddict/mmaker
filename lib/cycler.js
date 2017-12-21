// libs
const log = require('./log')

module.exports = class Cycler {
  constructor (engine) {
    // Are we running?
    this.running = false

    // We need a referrence to the engine
    // This is hackish, but it's the fastest way to share data
    // With all the parts of this bot
    this.engine = engine
  }

  start () {
    this.running = true
    this.cycle()
  }

  stop () {
    this.running = false
  }

  cycle () {
    log.n(log.error(`Method "${this.cycle.name}" not implemented in class "${this.constructor.name}"`))
    this.stop()
  }
}
