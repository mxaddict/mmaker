#!/usr/bin/env node
// Load our arguments
const argv = require('yargs')
  .default({
    conf: 'conf.js'
  })
  .argv

// Load our engine with the passed args
const Engine = require('./lib/engine')

// Get an instance
const engine = new Engine(argv)

// Start your engines
engine.start()
