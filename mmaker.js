#!/usr/bin/env node
// Load our arguments
const argv = require('yargs')
  .default({
    reset_profit: false
  })
  .argv

// Load our engine with the passed args
const Engine = require('./src/engine')

// Get an instance
const engine = new Engine(argv)

// Start your engines
engine.start()
