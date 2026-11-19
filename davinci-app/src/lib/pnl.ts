import type { RawDeal, Trade } from './types';
import { rescale } from './money';
import { DEAL_STATUS } from '../ctrader/constants';

/**
 * Deals → trades.
 *
 * Net P&L rule (per closing deal, then summed per position):
 *   net = closePositionDetail.grossProfit + closePositionDetail.swap
 *       + closePositionDetail.commission + closePositionDetail.pnlConversionFee
 *
 * Why closePositionDetail.commission and not Σ deal.commission:
 *   cTrader does not book commission to the balance when a position opens — ProtoOAPosition.commission
 *   is documented as "current UNREALIZED commission". It is realized on close:
 *   ProtoOAClosePositionDetail.commission = "realized commission related to closed volume", i.e. the
 *   entry-side share of the closed volume plus the exit side. Adding the opening deal's own
 *   `commission` on top would count the entry side twice. The closePositionDetail figures are exactly
 *   what moved `closePositionDetail.balance`, which the debug view checks deal by deal.
 *   Σ deal.commission is still computed (`dealCommissionU`) for comparison in the debug view; for a
 *   fully closed position the two are normally equal.
 */

const FILLED = new Set<number>([DEAL_STATUS.FILLED, DEAL_STATUS.PARTIALLY_FILLED]);

export function isExecuted(d: RawDeal): boolean {
  return FILLED.has(d.dealStatus) && d.filledVolume > 0;
}

export function dealDigits(d: RawDeal, fallback: number): number {
  return d.closePositionDetail?.moneyDigits ?? d.moneyDigits ?? fallback;
}

export interface BuildOptions {
  symbols: Map<number, string>;
  /** Position keys (`${accountId}:${positionId}`) known to be open (from ReconcileRes). */
  openPositions?: Set<string>;
  /** Account moneyDigits by account id (fallback when deals omit moneyDigits). */
  accountDigits?: Map<number, number>;
}

export interface TradeBreakdown {
  trade: Trade;
  dealCommissionU: number;
}

export function groupByPosition(deals: RawDeal[]): Map<string, RawDeal[]> {
  const map = new Map<string, RawDeal[]>();
  for (const d of deals) {
    if (!isExecuted(d)) continue;
    const k = `${d.accountId}:${d.positionId}`;
    let arr = map.get(k);
    if (!arr) map.set(k, (arr = []));
    arr.push(d);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.executionTimestamp - b.executionTimestamp || a.dealId - b.dealId);
  return map;
}

export function buildTrade(key: string, deals: RawDeal[], opts: BuildOptions): TradeBreakdown {
  const first = deals[0]!;
  const fallbackDigits = opts.accountDigits?.get(first.accountId) ?? 2;
  const digits = deals.reduce((m, d) => Math.max(m, dealDigits(d, fallbackDigits)), 0);

  const opening = deals.filter((d) => !d.closePositionDetail);
  const closing = deals.filter((d) => d.closePositionDetail);

  let grossU = 0;
  let swapU = 0;
  let commissionU = 0;
  let feeU = 0;
  let dealCommissionU = 0;
  let closedCents = 0;
  let exitNotional = 0;
  for (const d of deals) dealCommissionU += rescale(d.commission ?? 0, dealDigits(d, fallbackDigits), digits);
  for (const d of closing) {
    const c = d.closePositionDetail!;
    const dd = c.moneyDigits ?? d.moneyDigits ?? fallbackDigits;
    grossU += rescale(c.grossProfit, dd, digits);
    swapU += rescale(c.swap, dd, digits);
    commissionU += rescale(c.commission, dd, digits);
    feeU += rescale(c.pnlConversionFee ?? 0, dd, digits);
    const vol = c.closedVolume ?? d.filledVolume;
    closedCents += vol;
    exitNotional += (d.executionPrice ?? 0) * vol;
  }

  let openedCents = 0;
  let entryNotional = 0;
  for (const d of opening) {
    openedCents += d.filledVolume;
    entryNotional += (d.executionPrice ?? 0) * d.filledVolume;
  }

  const sideDeal = opening[0] ?? first;
  // A closing deal trades the opposite side of the position.
  const side = opening[0] ? sideDeal.tradeSide : first.tradeSide === 1 ? 2 : 1;
  const entryPrice = openedCents > 0 ? entryNotional / openedCents : (closing[0]?.closePositionDetail?.entryPrice ?? 0);
  const exitPrice = closedCents > 0 ? exitNotional / closedCents : null;

  const knownOpen = opts.openPositions?.has(key) ?? false;
  const fullyClosed = closing.length > 0 && (openedCents === 0 || closedCents >= openedCents);
  const status = knownOpen || !fullyClosed ? 'open' : 'closed';

  const openTime = (opening[0] ?? first).executionTimestamp;
  const closeTime = status === 'closed' ? closing[closing.length - 1]!.executionTimestamp : null;

  const trade: Trade = {
    key,
    accountId: first.accountId,
    positionId: first.positionId,
    symbolId: first.symbolId,
    symbol: opts.symbols.get(first.symbolId) ?? `#${first.symbolId}`,
    side: side === 1 ? 'buy' : 'sell',
    volume: Math.max(openedCents, closedCents) / 100,
    closedVolume: closedCents / 100,
    entryPrice,
    exitPrice,
    openTime,
    closeTime,
    grossU,
    swapU,
    commissionU,
    feeU,
    netU: grossU + swapU + commissionU + feeU,
    moneyDigits: digits,
    durationMs: closeTime !== null ? closeTime - openTime : null,
    status,
    dealCount: deals.length,
    partialCloses: Math.max(0, closing.length - 1),
  };
  return { trade, dealCommissionU };
}

export function buildTrades(deals: RawDeal[], opts: BuildOptions): Trade[] {
  const out: Trade[] = [];
  for (const [key, ds] of groupByPosition(deals)) out.push(buildTrade(key, ds, opts).trade);
  return out.sort((a, b) => (b.closeTime ?? b.openTime) - (a.closeTime ?? a.openTime));
}

/** Rebuild only positions touched by `changedDeals` (incremental sync). */
export function affectedPositionKeys(changedDeals: RawDeal[]): Set<string> {
  return new Set(changedDeals.map((d) => `${d.accountId}:${d.positionId}`));
}

/** Balance-chain check: does each closing deal's balance equal previous balance + its net? */
export interface BalanceCheck {
  dealId: number;
  expectedU: number;
  actualU: number;
  ok: boolean;
}

export function balanceChain(closingDeals: RawDeal[], fallbackDigits = 2): BalanceCheck[] {
  const sorted = closingDeals
    .filter((d) => d.closePositionDetail)
    .sort((a, b) => (a.closePositionDetail!.balanceVersion ?? a.executionTimestamp) - (b.closePositionDetail!.balanceVersion ?? b.executionTimestamp));
  const out: BalanceCheck[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!.closePositionDetail!;
    const cur = sorted[i]!.closePositionDetail!;
    // Only consecutive balance versions are comparable (no deposit/swap booking in between).
    if (prev.balanceVersion === undefined || cur.balanceVersion === undefined || cur.balanceVersion !== prev.balanceVersion + 1) continue;
    const d = cur.moneyDigits ?? fallbackDigits;
    const net = cur.grossProfit + cur.swap + cur.commission + (cur.pnlConversionFee ?? 0);
    const expectedU = rescale(prev.balance, prev.moneyDigits ?? fallbackDigits, d) + net;
    out.push({ dealId: sorted[i]!.dealId, expectedU, actualU: cur.balance, ok: expectedU === cur.balance });
  }
  return out;
}
