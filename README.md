# MMAKER

<a href="https://gitter.im/MMakerBot/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge"><img alt="Join the chat at https://gitter.im/MMakerBot/Lobby" src="https://badges.gitter.im/MMakerBot/Lobby.svg"></a>
<a href="https://travis-ci.org/mxaddict/mmaker"><img alt="Check Build status at https://travis-ci.org/mxaddict/mmaker" src="https://travis-ci.org/mxaddict/mmaker.svg?branch=master"></a>

## What is this even for?

The main purpose of this project is for my experimentation only, but since it's MIT licensed, then dick, tom and harry can use it if they want, in good old `PUT YOUR MONEY WHERE YOUR MOUTH IS` style.

## Ok, but what does it do?

This project will allow you to run a `Market Maker` *trading bot* to provide liquidity to markets where a spread exists

## How to get it running?

Install NodeJS v9.x ( I suggest NVM )

Install packages

```bash
npm install
```

Copy the base conf

```bash
cp config/sample.js config/default.js
```

Edit the config with your settings

```bash
vim config/default.js
```

Run with the following command

```bash
./mmaker.js
```

Once Running, the output should look like this

![Sample BOT run](https://raw.githubusercontent.com/mxaddict/mmaker/master/img/output.png)

Check out [Sample BOT Trades](https://raw.githubusercontent.com/mxaddict/mmaker/master/sample_trades.ods) for an idea of what you can do with this `BOT`

## Supported exchanges?

Right now I have been only using the bot with `binance`, but in theory it will work with any exchange that is on this `CCXT` support list

# I want to monitor the bot while i'm mobile, how?

Use [MMonitor Mobile](https://github.com/mxaddict/mmonitor-mobile), go ahead, click it...

NOTE: You need to set `saveReport` to `true` in your MMaker config, and host a server with web root as `/path/to/mmaker/public`

## Known issues?

TODO: We need to find the issues and report them

## I made some money with your BOT, how do I donate?

Send your donations here:

```
BTC:  1K6pkKRRwrDaGUzyWoe15cqY9YTNyr7Ku6
BCH:  1NAfUksRFcJ82s59rUEEsQn7MgavrgdX3L
DASH: XrDV5n5nTHY3MVWqProESuvpmCPPMBF69q
ETH:  0x1aAebc828Af1df144Ee902189112D0d422aBD404
LTC:  Laq7Wfnerq2zbSRr4L2J2PR8d6CzkGREm7
NAV:  NVb3mSb7vPsNTZtCvM31cLwRErcQxzv1X8
```

NOTE: if you wanna donate other alts, let me know, I can arrange for an address `¯\_(ツ)_/¯`
