# MMAKER
<a href="https://travis-ci.org/mxaddict/mmaker"><img src="https://travis-ci.org/mxaddict/mmaker.svg?branch=master"></a>

## What is this even for?

The main purpose of this project is for my experimentation only, but since it's MIT licensed, then dick, tom and harry can use it if they want, in good old `PUT YOUR MONEY WHERE YOUR MOUTH IS` style.

## Ok, but what does it do?

This project will allow you to run a `Market Maker` *trading bot* to provide liquidity to markets where a spread exists

## How to get it running?

Install NodeJS v9.x


Copy the base conf

```bash
cp base.conf.js conf.js
```

Edit the config with your settings

```bash
vim conf.js
```

Run with the following command

```bash
./mmaker.js
```

## I made some money with your BOT, how do I donate?

Send your donations here:

```
BTC:  15cnoKuvP99mXbHGKt6MCEQH5rb8GkyYvA
BCH:  1JVnEfbcBq1omZ4sD56Fxgn7n8XCFzFfwk
DASH: Xn6Pe1phnHvNuffa8cChfoGarypVDgjYYv
ETH:  0xc48dBdB37a5359c69A01671D45B14fe4Fcf69086
LTC:  LL6Ntjv6jja1gzyFatK5rKoiWgQJp5anH2
```

NOTE: if you wanna donate other alts, let me know, I can arrange for an address `¯\_(ツ)_/¯`

## Supported exchanges?

Right now it will only work with `bitfinex` v1 API

I plan on adding more exchange API support in the future once I have time

## Known issues?

Sometimes the `BOT` gets confused and stops updating the orders

Just manually `Cancel All` open orders, this will fix this issue

NOTE: I made changes to fix this, so should no longer happen
