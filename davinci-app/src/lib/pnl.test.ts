import { describe, expect, it } from 'vitest';
import { buildTrade, buildTrades, balanceChain, groupByPosition } from './pnl';
import type { RawDeal, RawClosePositionDetail } from './types';

let id = 1;
const ACC = 77;
function deal(p: Partial<RawDeal> & { positionId: number; executionTimestamp: number; tradeSide: 1 | 2; filledVolume: number }): RawDeal {
  const dealId = id++;
  return { key: `${ACC}:${dealId}`, accountId: ACC, dealId, orderId: dealId, volume: p.filledVolume, symbolId: 1, createTimestamp: p.executionTimestamp, dealStatus: 2, moneyDigits: 2, ...p };
}
const cpd = (p: Partial<RawClosePositionDetail>): RawClosePositionDetail => ({ entryPrice: 1.1, grossProfit: 0, swap: 0, commission: 0, balance: 0, moneyDigits: 2, ...p });
const symbols = new Map([[1, 'EURUSD']]);
const T0 = Date.UTC(2026, 2, 2, 9, 0);

describe('deals → trade net P&L', () => {
  it('simple winner with round-turn commission realized on close (no double count)', () => {
    const deals = [
      deal({ positionId: 1, executionTimestamp: T0, tradeSide: 1, filledVolume: 10_000_000, executionPrice: 1.1, commission: -350 }),
      deal({ positionId: 1, executionTimestamp: T0 + 3600_000, tradeSide: 2, filledVolume: 10_000_000, executionPrice: 1.102, commission: -350, closePositionDetail: cpd({ grossProfit: 20_000, commission: -700, closedVolume: 10_000_000 }) }),
    ];
    const { trade, dealCommissionU } = buildTrade(`${ACC}:1`, deals, { symbols });
    expect(trade.grossU).toBe(20_000);
    expect(trade.commissionU).toBe(-700);
    expect(dealCommissionU).toBe(-700); // Σ deal.commission agrees with Σ cpd.commission
    expect(trade.netU).toBe(19_300); // 200.00 − 7.00
    expect(trade.side).toBe('buy');
    expect(trade.volume).toBe(100_000); // cents / 100
    expect(trade.status).toBe('closed');
    expect(trade.durationMs).toBe(3600_000);
  });

  it('partial closes: sums every closing deal, closes at the last one', () => {
    const deals = [
      deal({ positionId: 2, executionTimestamp: T0, tradeSide: 2, filledVolume: 20_000_000, executionPrice: 1.2, commission: -700 }),
      deal({ positionId: 2, executionTimestamp: T0 + 1000, tradeSide: 1, filledVolume: 5_000_000, executionPrice: 1.199, commission: -175, closePositionDetail: cpd({ grossProfit: 5_000, commission: -350, closedVolume: 5_000_000 }) }),
      deal({ positionId: 2, executionTimestamp: T0 + 2000, tradeSide: 1, filledVolume: 15_000_000, executionPrice: 1.198, commission: -525, closePositionDetail: cpd({ grossProfit: 30_000, commission: -1_050, closedVolume: 15_000_000 }) }),
    ];
    const { trade } = buildTrade(`${ACC}:2`, deals, { symbols });
    expect(trade.side).toBe('sell');
    expect(trade.grossU).toBe(35_000);
    expect(trade.commissionU).toBe(-1_400);
    expect(trade.netU).toBe(33_600);
    expect(trade.partialCloses).toBe(1);
    expect(trade.closeTime).toBe(T0 + 2000);
    expect(trade.exitPrice).toBeCloseTo((1.199 * 5 + 1.198 * 15) / 20, 10);
  });

  it('partially closed position that is still open stays open', () => {
    const deals = [
      deal({ positionId: 3, executionTimestamp: T0, tradeSide: 1, filledVolume: 10_000_000, executionPrice: 1.1 }),
      deal({ positionId: 3, executionTimestamp: T0 + 10, tradeSide: 2, filledVolume: 4_000_000, closePositionDetail: cpd({ grossProfit: 1_000, closedVolume: 4_000_000 }) }),
    ];
    const { trade } = buildTrade(`${ACC}:3`, deals, { symbols });
    expect(trade.status).toBe('open');
    expect(trade.closeTime).toBeNull();
  });

  it('losing trade with commission', () => {
    const deals = [
      deal({ positionId: 4, executionTimestamp: T0, tradeSide: 1, filledVolume: 5_000_000, commission: -175 }),
      deal({ positionId: 4, executionTimestamp: T0 + 60_000, tradeSide: 2, filledVolume: 5_000_000, commission: -175, closePositionDetail: cpd({ grossProfit: -12_345, commission: -350, closedVolume: 5_000_000 }) }),
    ];
    expect(buildTrade(`${ACC}:4`, deals, { symbols }).trade.netU).toBe(-12_695);
  });

  it('swap over several days is included', () => {
    const deals = [
      deal({ positionId: 5, executionTimestamp: T0, tradeSide: 1, filledVolume: 10_000_000, commission: -350 }),
      deal({ positionId: 5, executionTimestamp: T0 + 3 * 86_400_000, tradeSide: 2, filledVolume: 10_000_000, commission: -350, closePositionDetail: cpd({ grossProfit: 10_000, swap: -270, commission: -700, closedVolume: 10_000_000 }) }),
    ];
    const t = buildTrade(`${ACC}:5`, deals, { symbols }).trade;
    expect(t.swapU).toBe(-270);
    expect(t.netU).toBe(10_000 - 270 - 700);
  });

  it('breakeven trade nets exactly 0', () => {
    const deals = [
      deal({ positionId: 6, executionTimestamp: T0, tradeSide: 1, filledVolume: 1_000_000 }),
      deal({ positionId: 6, executionTimestamp: T0 + 5, tradeSide: 2, filledVolume: 1_000_000, closePositionDetail: cpd({ grossProfit: 70, commission: -70, closedVolume: 1_000_000 }) }),
    ];
    expect(buildTrade(`${ACC}:6`, deals, { symbols }).trade.netU).toBe(0);
  });

  it('pnlConversionFee is part of net', () => {
    const deals = [
      deal({ positionId: 7, executionTimestamp: T0, tradeSide: 1, filledVolume: 1_000_000 }),
      deal({ positionId: 7, executionTimestamp: T0 + 5, tradeSide: 2, filledVolume: 1_000_000, closePositionDetail: cpd({ grossProfit: 1000, pnlConversionFee: -3, closedVolume: 1_000_000 }) }),
    ];
    const t = buildTrade(`${ACC}:7`, deals, { symbols }).trade;
    expect(t.feeU).toBe(-3);
    expect(t.netU).toBe(997);
  });

  it('mixed moneyDigits are rescaled exactly to the largest scale', () => {
    const deals = [
      deal({ positionId: 8, executionTimestamp: T0, tradeSide: 1, filledVolume: 100, moneyDigits: 2, commission: -1 }),
      deal({ positionId: 8, executionTimestamp: T0 + 5, tradeSide: 2, filledVolume: 100, moneyDigits: 8, commission: -1_000_000, closePositionDetail: cpd({ moneyDigits: 8, grossProfit: 123_456_789, commission: -2_000_000, closedVolume: 100 }) }),
    ];
    const t = buildTrade(`${ACC}:8`, deals, { symbols }).trade;
    expect(t.moneyDigits).toBe(8);
    expect(t.netU).toBe(121_456_789);
  });

  it('ignores rejected deals and dedupes nothing by itself (upsert happens by dealId)', () => {
    const deals = [
      deal({ positionId: 9, executionTimestamp: T0, tradeSide: 1, filledVolume: 1_000_000 }),
      deal({ positionId: 9, executionTimestamp: T0 + 1, tradeSide: 2, filledVolume: 0, dealStatus: 4, closePositionDetail: cpd({ grossProfit: 99_999 }) }),
    ];
    expect(groupByPosition(deals).get(`${ACC}:9`)!.length).toBe(1);
  });

  it('closing deal without its opening deal (history window) is still a closed trade', () => {
    const deals = [deal({ positionId: 10, executionTimestamp: T0, tradeSide: 2, filledVolume: 1_000_000, closePositionDetail: cpd({ grossProfit: 500, entryPrice: 1.05, closedVolume: 1_000_000 }) })];
    const t = buildTrades(deals, { symbols })[0]!;
    expect(t.status).toBe('closed');
    expect(t.side).toBe('buy');
    expect(t.entryPrice).toBe(1.05);
  });

  it('open position from reconcile stays open', () => {
    const deals = [deal({ positionId: 11, executionTimestamp: T0, tradeSide: 1, filledVolume: 1_000_000 })];
    expect(buildTrades(deals, { symbols, openPositions: new Set([`${ACC}:11`]) })[0]!.status).toBe('open');
  });
});

describe('balance chain check', () => {
  it('flags consecutive closes whose balance does not match previous + net', () => {
    const a = deal({ positionId: 20, executionTimestamp: T0, tradeSide: 2, filledVolume: 1, closePositionDetail: cpd({ balance: 1_000_000, balanceVersion: 5 }) });
    const b = deal({ positionId: 21, executionTimestamp: T0 + 1, tradeSide: 2, filledVolume: 1, closePositionDetail: cpd({ grossProfit: 500, commission: -20, balance: 1_000_480, balanceVersion: 6 }) });
    const c = deal({ positionId: 22, executionTimestamp: T0 + 2, tradeSide: 2, filledVolume: 1, closePositionDetail: cpd({ grossProfit: 100, balance: 1_000_000, balanceVersion: 7 }) });
    const r = balanceChain([a, b, c]);
    expect(r.map((x) => x.ok)).toEqual([true, false]);
  });
});
