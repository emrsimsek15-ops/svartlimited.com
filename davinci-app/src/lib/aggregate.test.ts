import { describe, expect, it } from 'vitest';
import { computeStats, dailyMap, monthView, commonDigits, byWeekday, bySymbol } from './aggregate';
import { buildTrades } from './pnl';
import { generateSampleData } from './demo';
import type { Trade } from './types';

function t(netU: number, closeTime: number, extra: Partial<Trade> = {}): Trade {
  return {
    key: `1:${closeTime}:${netU}`, accountId: 1, positionId: closeTime, symbolId: 1, symbol: 'EURUSD', side: 'buy', volume: 1, closedVolume: 1,
    entryPrice: 1, exitPrice: 1, openTime: closeTime - 1000, closeTime, grossU: netU, swapU: 0, commissionU: 0, feeU: 0, netU, moneyDigits: 2,
    durationMs: 1000, status: 'closed', dealCount: 2, partialCloses: 0, ...extra,
  };
}
const H = 3600_000;

describe('stats', () => {
  it('win rate, profit factor, averages, expectancy, drawdown', () => {
    const base = Date.UTC(2026, 0, 5);
    const trades = [t(10_000, base + H), t(-5_000, base + 2 * H), t(0, base + 3 * H), t(-3_000, base + 4 * H), t(20_000, base + 5 * H)];
    const s = computeStats(trades, 2);
    expect(s.count).toBe(5);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(2);
    expect(s.breakeven).toBe(1);
    expect(s.netU).toBe(22_000);
    expect(s.winRate).toBe(0.5); // breakeven excluded
    expect(s.profitFactor).toBeCloseTo(30_000 / 8_000);
    expect(s.avgWinU).toBe(15_000);
    expect(s.avgLossU).toBe(-4_000);
    expect(s.expectancyU).toBe(4_400);
    // equity: 100, 50, 50, 20, 220 → peak 100, trough 20 → dd 80.00
    expect(s.maxDrawdownU).toBe(8_000);
  });

  it('empty / no losses', () => {
    expect(computeStats([], 2).winRate).toBeNull();
    expect(computeStats([t(100, 1)], 2).profitFactor).toBeNull();
  });

  it('open trades are excluded', () => {
    const s = computeStats([t(100, 1), t(500, 2, { status: 'open', closeTime: null })], 2);
    expect(s.count).toBe(1);
  });

  it('drawdown counts from zero when the first trade loses', () => {
    expect(computeStats([t(-500, 1), t(200, 2)], 2).maxDrawdownU).toBe(500);
  });
});

describe('calendar aggregation', () => {
  it('buckets by close time in the selected timezone', () => {
    const trades = [t(100, Date.UTC(2026, 0, 31, 22, 30)), t(-40, Date.UTC(2026, 0, 31, 20, 0))];
    const utc = dailyMap(trades, 'UTC', 2);
    expect(utc.get('2026-01-31')!.netU).toBe(60);
    const ist = dailyMap(trades, 'Europe/Istanbul', 2);
    expect(ist.get('2026-01-31')!.netU).toBe(-40);
    expect(ist.get('2026-02-01')!.netU).toBe(100); // moves into February
    expect(monthView(2026, 1, 1, ist).summary.netU).toBe(-40);
    expect(monthView(2026, 2, 1, ist).summary.netU).toBe(100);
  });

  it('adjacent-month days never count; day totals and week totals sum to the month total', () => {
    const data = generateSampleData(Date.UTC(2026, 10, 19, 12), 7);
    const trades = buildTrades(data.deals, { symbols: data.symbols, openPositions: data.openPositions });
    const digits = commonDigits(trades);
    for (const tz of ['UTC', 'Europe/Istanbul', 'America/New_York', 'Asia/Tokyo']) {
      const days = dailyMap(trades, tz, digits);
      for (let m = 5; m <= 11; m++) {
        const v = monthView(2026, m, 1, days);
        const prefix = `2026-${String(m).padStart(2, '0')}-`;
        const inMonthDays = v.grid.flat().filter((c) => c.inMonth);
        const daySum = inMonthDays.reduce((s, c) => s + (days.get(c.key)?.netU ?? 0), 0);
        const weekSum = v.weeks.reduce((s, w) => s + w.netU, 0);
        const direct = trades.filter((x) => x.status === 'closed' && new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(x.closeTime!).startsWith(prefix)).reduce((s, x) => s + x.netU, 0);
        expect(daySum).toBe(v.summary.netU);
        expect(weekSum).toBe(v.summary.netU);
        expect(direct).toBe(v.summary.netU);
        expect(v.summary.greenDays + v.summary.redDays + v.summary.flatDays).toBe(v.summary.tradingDays);
        expect(v.weeks.reduce((s, w) => s + w.trades, 0)).toBe(v.summary.trades);
      }
    }
  });

  it('best/worst day and color reference', () => {
    const d = Date.UTC(2026, 2, 3, 12);
    const days = dailyMap([t(500, d), t(-900, d + 86_400_000), t(100, d + 2 * 86_400_000)], 'UTC', 2);
    const s = monthView(2026, 3, 1, days).summary;
    expect(s.best!.key).toBe('2026-03-03');
    expect(s.worst!.key).toBe('2026-03-04');
    expect(s.maxAbsU).toBe(900);
    expect(s.greenDays).toBe(2);
    expect(s.redDays).toBe(1);
  });
});

describe('breakdowns', () => {
  it('weekday buckets are Monday-first and complete', () => {
    const w = byWeekday([t(100, Date.UTC(2026, 10, 16, 12))], 2, 'UTC'); // Monday
    expect(w.length).toBe(7);
    expect(w[0]!.netU).toBe(100);
  });
  it('by symbol sums', () => {
    const b = bySymbol([t(100, 1), t(50, 2), t(-30, 3, { symbol: 'XAUUSD' })], 2);
    expect(b.find((x) => x.id === 'EURUSD')!.netU).toBe(150);
  });
});

describe('sample data', () => {
  it('has ~300 trades over ~6 months, winners and losers, consistent balance chain', () => {
    const data = generateSampleData(Date.UTC(2026, 10, 19, 12));
    const trades = buildTrades(data.deals, { symbols: data.symbols, openPositions: data.openPositions });
    const closed = trades.filter((x) => x.status === 'closed');
    expect(closed.length).toBeGreaterThan(250);
    expect(closed.length).toBeLessThan(400);
    const s = computeStats(trades, 2);
    expect(s.wins).toBeGreaterThan(50);
    expect(s.losses).toBeGreaterThan(50);
    expect(new Set(closed.map((x) => x.symbol)).size).toBeGreaterThanOrEqual(5);
    expect(closed.some((x) => x.partialCloses > 0)).toBe(true);
    expect(closed.some((x) => x.swapU !== 0)).toBe(true);
  });
});
