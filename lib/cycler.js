// libs
const log = require('./log')

module.exports = class Cycler {
  constructor (engine) {
    // Are we running?
    this.run = false

    // We need a referrence to the engine
    // This is hackish, but it's the fastest way to share data
    // With all the parts of this bot
    this.engine = engine
  }

  async start () {
    this.run = true
    while (this.run) {
      await this.cycle()
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
