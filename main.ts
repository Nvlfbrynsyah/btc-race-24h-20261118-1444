/**
 * washout-ride — long-only CBBTC vs USDC.
 * Entry: flat, no warm-up, cash >= 1,000,000 quote units, >= 121 closes,
 * and < 1380 CBBTC bars seen; close more than 220 bps below the 121-close
 * high and more than 25 bps above its low. Buy with all cash.
 * Exit: sell all at return >= +400 bps, <= -100 bps, or >= 360 bars held.
 * All orders allow at most 200 bps slippage.
 */
import { runBars, type Bar } from './vendor/makefun-bars.ts';

const closes: bigint[] = [];
let barsSeen = 0n;
let entryBar: bigint | null = null;

await runBars({
  onBatch(state, batch) {
    const bar: Bar | undefined = batch.bars.find((bar) => bar.symbol === 'CBBTC');
    if (bar === undefined) return [];

    const close = BigInt(bar.c);
    barsSeen += 1n;
    closes.push(close);
    if (closes.length > 121) closes.shift();

    const position = state.positions.get('CBBTC');
    if (position !== undefined && position.qty > 0n) {
      const value = state.value('CBBTC', position.qty);
      const scaledProfit = (value - position.cost) * 10000n;
      // For positive cost, these match the specified truncated return_bps tests.
      const takeProfit = position.cost > 0n && scaledProfit >= position.cost * 400n;
      const stopLoss = position.cost > 0n && scaledProfit <= position.cost * -100n;
      const maxHold = entryBar !== null && barsSeen - entryBar >= 360n;

      if (takeProfit || stopLoss || maxHold) {
        entryBar = null;
        return [{
          side: 'sell',
          symbol: 'CBBTC',
          qty: position.qty,
          max_slippage_bps: 200,
        }];
      }
      return [];
    }

    entryBar = null;
    if (state.warmingUp || state.cash < 1000000n || closes.length < 121 || barsSeen >= 1380n) {
      return [];
    }

    let high = closes[0]!;
    let low = closes[0]!;
    for (const recordedClose of closes) {
      if (recordedClose > high) high = recordedClose;
      if (recordedClose < low) low = recordedClose;
    }

    if (close * 10000n < high * 9780n && close * 10000n > low * 10025n) {
      entryBar = barsSeen;
      return [{
        side: 'buy',
        symbol: 'CBBTC',
        notional_quote_units: state.cash,
        max_slippage_bps: 200,
      }];
    }
    return [];
  },
});
