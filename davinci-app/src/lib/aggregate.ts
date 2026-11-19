import type { Trade, JournalEntry } from './types';
import { rescale, fromUnits } from './money';
import { dayKey, hourInTz, isoWeekdayInTz, inRange, monthGrid, parseKey, type DayKey, type DayRange, type GridCell } from './time';

/**
 * Pure aggregation functions. Every sum is done on integer units at a common scale (`digits`), so
 * day totals add up exactly to week/month totals. Convert with `fromUnits(x, digits)` for display.
 */

export function closedTrades(trades: Trade[]): Trade[] {
  return trades.filter((t) => t.status === 'closed' && t.closeTime !== null);
}

export function commonDigits(trades: Trade[]): number {
  let d = 2;
  for (const t of trades) if (t.moneyDigits > d) d = t.moneyDigits;
  return d;
}

export const netAt = (t: Trade, digits: number) => rescale(t.netU, t.moneyDigits, digits);

export type Outcome = 'win' | 'loss' | 'be';
export const outcome = (t: Trade): Outcome => (t.netU > 0 ? 'win' : t.netU < 0 ? 'loss' : 'be');

export function tradeDay(t: Trade, tz: string): DayKey {
  return dayKey(t.closeTime ?? t.openTime, tz);
}

export function filterByRange(trades: Trade[], tz: string, r: DayRange): Trade[] {
  if (r.from === null && r.to === null) return trades;
  return trades.filter((t) => inRange(tradeDay(t, tz), r));
}

// ---- daily ------------------------------------------------------------------
export interface DayStat {
  key: DayKey;
  netU: number;
  count: number;
  wins: number;
  losses: number;
  breakeven: number;
}

export type DayMap = Map<DayKey, DayStat>;

/** Buckets CLOSED trades by close time in `tz`. */
export function dailyMap(trades: Trade[], tz: string, digits: number): DayMap {
  const map: DayMap = new Map();
  for (const t of trades) {
    if (t.status !== 'closed' || t.closeTime === null) continue;
    const key = dayKey(t.closeTime, tz);
    let s = map.get(key);
    if (!s) map.set(key, (s = { key, netU: 0, count: 0, wins: 0, losses: 0, breakeven: 0 }));
    s.netU += netAt(t, digits);
    s.count++;
    const o = outcome(t);
    if (o === 'win') s.wins++;
    else if (o === 'loss') s.losses++;
    else s.breakeven++;
  }
  return map;
}

export function sortedDays(map: DayMap): DayStat[] {
  return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

// ---- month ------------------------------------------------------------------
export interface MonthSummary {
  netU: number;
  trades: number;
  tradingDays: number;
  greenDays: number;
  redDays: number;
  flatDays: number;
  best: DayStat | null;
  worst: DayStat | null;
  /** Largest |daily net| in the month — the color-scale reference. */
  maxAbsU: number;
}

export function monthSummary(y: number, m: number, days: DayMap): MonthSummary {
  const prefix = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-`;
  const s: MonthSummary = { netU: 0, trades: 0, tradingDays: 0, greenDays: 0, redDays: 0, flatDays: 0, best: null, worst: null, maxAbsU: 0 };
  for (const d of days.values()) {
    if (!d.key.startsWith(prefix) || d.count === 0) continue;
    s.netU += d.netU;
    s.trades += d.count;
    s.tradingDays++;
    if (d.netU > 0) s.greenDays++;
    else if (d.netU < 0) s.redDays++;
    else s.flatDays++;
    if (!s.best || d.netU > s.best.netU) s.best = d;
    if (!s.worst || d.netU < s.worst.netU) s.worst = d;
    s.maxAbsU = Math.max(s.maxAbsU, Math.abs(d.netU));
  }
  if (s.best && s.best.netU <= 0) s.best = null;
  if (s.worst && s.worst.netU >= 0) s.worst = null;
  return s;
}

export interface WeekSummary {
  index: number;
  netU: number;
  trades: number;
  tradingDays: number;
  /** True when at least one day of the row belongs to the month. */
  hasMonthDays: boolean;
}

/** Weekly totals count only days of the displayed month, so the weeks sum exactly to the month. */
export function weekSummaries(grid: GridCell[][], days: DayMap): WeekSummary[] {
  return grid.map((row, index) => {
    const w: WeekSummary = { index, netU: 0, trades: 0, tradingDays: 0, hasMonthDays: row.some((c) => c.inMonth) };
    for (const c of row) {
      if (!c.inMonth) continue;
      const d = days.get(c.key);
      if (!d || d.count === 0) continue;
      w.netU += d.netU;
      w.trades += d.count;
      w.tradingDays++;
    }
    return w;
  });
}

export interface MonthView {
  y: number;
  m: number;
  grid: GridCell[][];
  weeks: WeekSummary[];
  summary: MonthSummary;
}

export function monthView(y: number, m: number, weekStartsOn: number, days: DayMap): MonthView {
  const grid = monthGrid(y, m, weekStartsOn);
  return { y, m, grid, weeks: weekSummaries(grid, days), summary: monthSummary(y, m, days) };
}

// ---- stats ------------------------------------------------------------------
export interface Stats {
  count: number;
  wins: number;
  losses: number;
  breakeven: number;
  netU: number;
  grossWinU: number;
  grossLossU: number; // negative or 0
  /** wins / (wins + losses); breakeven trades are excluded. null when no decided trades. */
  winRate: number | null;
  /** grossWin / |grossLoss|; null when there are no losses. */
  profitFactor: number | null;
  avgWinU: number | null;
  avgLossU: number | null; // negative
  /** Average net per trade (all closed trades, breakeven included). */
  expectancyU: number | null;
  /** Largest peak-to-trough fall of the cumulative closed-trade P&L (positive number). */
  maxDrawdownU: number;
}

export function computeStats(trades: Trade[], digits: number): Stats {
  const closed = closedTrades(trades).slice().sort((a, b) => a.closeTime! - b.closeTime! || a.positionId - b.positionId);
  let wins = 0,
    losses = 0,
    be = 0,
    netU = 0,
    gw = 0,
    gl = 0,
    peak = 0,
    mdd = 0;
  for (const t of closed) {
    const n = netAt(t, digits);
    netU += n;
    if (n > 0) {
      wins++;
      gw += n;
    } else if (n < 0) {
      losses++;
      gl += n;
    } else be++;
    if (netU > peak) peak = netU;
    if (peak - netU > mdd) mdd = peak - netU;
  }
  const count = closed.length;
  return {
    count,
    wins,
    losses,
    breakeven: be,
    netU,
    grossWinU: gw,
    grossLossU: gl,
    winRate: wins + losses > 0 ? wins / (wins + losses) : null,
    profitFactor: gl < 0 ? gw / -gl : null,
    avgWinU: wins ? gw / wins : null,
    avgLossU: losses ? gl / losses : null,
    expectancyU: count ? netU / count : null,
    maxDrawdownU: mdd,
  };
}

// ---- series -----------------------------------------------------------------
export interface SeriesPoint {
  key: DayKey;
  value: number; // display units
  cumulative: number; // display units
}

export function dailySeries(days: DayMap, digits: number, range?: DayRange): SeriesPoint[] {
  let cum = 0;
  const out: SeriesPoint[] = [];
  for (const d of sortedDays(days)) {
    if (range && !inRange(d.key, range)) continue;
    cum += d.netU;
    out.push({ key: d.key, value: fromUnits(d.netU, digits), cumulative: fromUnits(cum, digits) });
  }
  return out;
}

// ---- breakdowns (reports) ---------------------------------------------------
export interface Bucket {
  id: string;
  label: string;
  netU: number;
  count: number;
  wins: number;
  losses: number;
}

function bucketize(trades: Trade[], digits: number, keyOf: (t: Trade) => string[] | string): Map<string, Bucket> {
  const map = new Map<string, Bucket>();
  for (const t of closedTrades(trades)) {
    const keys = keyOf(t);
    for (const k of Array.isArray(keys) ? keys : [keys]) {
      let b = map.get(k);
      if (!b) map.set(k, (b = { id: k, label: k, netU: 0, count: 0, wins: 0, losses: 0 }));
      const n = netAt(t, digits);
      b.netU += n;
      b.count++;
      if (n > 0) b.wins++;
      else if (n < 0) b.losses++;
    }
  }
  return map;
}

export function bySymbol(trades: Trade[], digits: number): Bucket[] {
  return [...bucketize(trades, digits, (t) => t.symbol).values()].sort((a, b) => b.netU - a.netU);
}

/** ISO weekday buckets "1".."7" in tz (by close time), always 7 entries in Monday-first order. */
export function byWeekday(trades: Trade[], digits: number, tz: string): Bucket[] {
  const m = bucketize(trades, digits, (t) => String(isoWeekdayInTz(t.closeTime!, tz)));
  return ['1', '2', '3', '4', '5', '6', '7'].map((k) => m.get(k) ?? { id: k, label: k, netU: 0, count: 0, wins: 0, losses: 0 });
}

/** Hour of day (0..23) of the OPEN time in tz — when the decision was made. */
export function byHour(trades: Trade[], digits: number, tz: string): Bucket[] {
  const m = bucketize(trades, digits, (t) => String(hourInTz(t.openTime, tz)));
  return Array.from({ length: 24 }, (_, h) => m.get(String(h)) ?? { id: String(h), label: String(h), netU: 0, count: 0, wins: 0, losses: 0 });
}

export function bySide(trades: Trade[], digits: number): Bucket[] {
  const m = bucketize(trades, digits, (t) => t.side);
  return (['buy', 'sell'] as const).map((k) => m.get(k) ?? { id: k, label: k, netU: 0, count: 0, wins: 0, losses: 0 });
}

export function byTag(trades: Trade[], digits: number, journal: Map<string, JournalEntry>, field: 'tags' | 'setup'): Bucket[] {
  const m = bucketize(trades, digits, (t) => {
    const j = journal.get(`trade:${t.key}`);
    if (!j) return [];
    if (field === 'setup') return j.setup ? [j.setup] : [];
    return j.tags;
  });
  return [...m.values()].sort((a, b) => b.netU - a.netU);
}

export function yearMonths(y: number, days: DayMap): { m: number; summary: MonthSummary }[] {
  return Array.from({ length: 12 }, (_, i) => ({ m: i + 1, summary: monthSummary(y, i + 1, days) }));
}

export function maxAbsInYear(y: number, days: DayMap): number {
  let max = 0;
  for (const d of days.values()) if (parseKey(d.key).y === y) max = Math.max(max, Math.abs(d.netU));
  return max;
}
