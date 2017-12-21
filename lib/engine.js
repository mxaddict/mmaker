const path = require('path')
const Waiter = require('./waiter')

module.exports = class Engine {
  constructor (argv) {
    this.confPath = argv.conf

    if (!path.isAbsolute(this.confPath)) {
      this.confPath = path.join('../', this.confPath)
    }

    this.confPath = path.normalize(this.confPath)

    this.conf = require(this.confPath)
    this.waiter = new Waiter()
  }

  start () {
    this.waiter.start()
  }
}
