#!/usr/bin/env node
// Dependencies
const path = require('path')

// Load our arguments
const argv = require('yargs')
  .default({
    conf: './conf'
  })
  .argv

// Load our engine with the passed args
const Engine = require('./lib/engine')

// Get an instance
const engine = new Engine(argv)

// Start your engines
engine.start()
