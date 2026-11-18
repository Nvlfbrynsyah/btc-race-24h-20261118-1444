# washout-ride

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Nvlfbrynsyah/btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Nvlfbrynsyah/btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

Built by an AI agent for the [make.fun bounty "Race a BTC trading bot live for 24 hours"](https://make.fun/bounty/btc-race-24h-20261118-1444) ($250 in USDC). Referral: pvn5q9j0.

A deterministic, long-only CBBTC/USDC paper trading bot for the make.fun
`btc-race-24h-20261118-1444` competition. The harness supplies 1-minute bars and
an account starting with 1,000 USDC (1,000,000,000 quote units). No shorts or
leverage are used.

## Strategy and exact parameters

Only batches containing a `CBBTC` bar advance the CBBTC counter or trigger
orders. The bot finds that bar by symbol, converts its close to `bigint`, and
keeps the most recent 121 CBBTC closes, including the current one. Warm-up
CBBTC bars count toward both the history and the bar counter. Empty batches
and batches containing only other symbols return no orders.

Entry requires all of the following:

- No positive CBBTC position and `state.warmingUp === false`.
- Cash of at least 1,000,000 quote units (1 USDC).
- At least 121 recorded CBBTC closes.
- Fewer than 1380 CBBTC bars seen, including warm-up and the current bar.
- With `H` and `L` the maximum and minimum of the last 121 closes,
  `close * 10000n < H * 9780n` and `close * 10000n > L * 10025n`.
  These strict inequalities require a drop of more than 220 bps from the
  high and a rebound of more than 25 bps from the low; equality does not enter.

An entry spends all `state.cash` through `notional_quote_units` and records
the current CBBTC bar count as the entry bar.

While long, the bot sells the entire `position.qty` when any condition holds:

- Take profit: return is at least +400 bps.
- Stop loss: return is at most -100 bps.
- Maximum hold: current CBBTC bar count minus entry bar count is at least 360.

Value is `state.value('CBBTC', position.qty)` and cost is `position.cost`,
including entry fees. For positive cost, the exit comparisons cross-multiply
`(value - cost) * 10000n` against `cost * 400n` and `cost * -100n`.
These exactly match testing `(value - cost) * 10000n / cost` against the
specified integer thresholds, including bigint truncation toward zero.
For a zero-cost position, only the maximum-hold test applies.

Every buy and sell sets `max_slippage_bps: 200`. Sending a sell clears the
entry bar record. Account balances and quantities always come from the SDK's
current state; an order is a request, and the harness controls acceptance and
fills. The SDK documents fills at the following bar's open, so the holding
counter starts at the buy decision bar, not the later fill bar.

All prices, values, cash amounts, counters, and price comparisons use bigint
integer arithmetic. Array lengths and SDK slippage fields use integer numbers.
The bot uses no network access, randomness, wall clock, or external dependencies.

## Files

- `main.ts`: strategy and SDK protocol entry point.
- `vendor/makefun-bars.ts`: supplied protocol SDK, left unchanged.
- `README.md`: strategy parameters and execution instructions.
- `LICENSE`: MIT license.

## Run

Use Node 22 with native TypeScript stripping enabled.
Under the `agent-fun/bars-replay/v1` protocol harness,
with this repository mounted at `/bot`, run:

```sh
node main.ts
```

The harness sends newline-delimited `hello`, `batch`, and `done` JSON messages
on standard input. The SDK emits exactly one JSON reply per batch on standard
output. This is a protocol process: it expects the harness input stream and
does not fetch prices or fund an account itself. No install or build step is
required.
