import { LIMITS, PT, ERR } from './constants';
import { CTraderError, type Transport } from './client';
import { normalizeCashFlow, normalizeDeal, num } from './normalize';
import type { CashFlow, RawDeal } from '../lib/types';

type Obj = Record<string, unknown>;

export interface Range {
  from: number;
  to: number;
}

/** Split [from, to) into consecutive chunks of at most `size` ms. */
export function planChunks(from: number, to: number, size: number): Range[] {
  const out: Range[] = [];
  for (let a = from; a < to; a += size) out.push({ from: a, to: Math.min(to, a + size) });
  return out;
}

/**
 * Fetch all deals in a range. If the server reports `hasMore` (more rows than maxRows), the range is
 * split in half and both halves fetched — so nothing is lost regardless of the server's chunk size.
 */
export async function fetchDeals(t: Transport, accountId: number, r: Range, depth = 0): Promise<RawDeal[]> {
  const res = await t.send<Obj>(PT.DEAL_LIST_REQ, { ctidTraderAccountId: accountId, fromTimestamp: r.from, toTimestamp: r.to, maxRows: LIMITS.dealListMaxRows });
  const deals = ((res.deal as Obj[] | undefined) ?? []).map((d) => normalizeDeal(accountId, d));
  if (res.hasMore && r.to - r.from > 1000 && depth < 20) {
    const mid = Math.floor((r.from + r.to) / 2);
    const [a, b] = [await fetchDeals(t, accountId, { from: r.from, to: mid }, depth + 1), await fetchDeals(t, accountId, { from: mid, to: r.to }, depth + 1)];
    return dedupe([...deals, ...a, ...b]);
  }
  return deals;
}

function dedupe(deals: RawDeal[]): RawDeal[] {
  const m = new Map<string, RawDeal>();
  for (const d of deals) m.set(d.key, d);
  return [...m.values()];
}

export interface TraderInfo {
  moneyDigits: number;
  balanceU: number;
  depositAssetId: number;
  currency: string;
  broker?: string;
  traderLogin?: number;
  registrationTimestamp?: number;
}

export interface SyncStore {
  saveDeals(accountId: number, deals: RawDeal[]): Promise<void>;
  saveCashFlows(rows: CashFlow[]): Promise<void>;
  saveSymbols(accountId: number, list: { symbolId: number; name: string }[]): Promise<void>;
  saveAccount(accountId: number, patch: Record<string, unknown>): Promise<void>;
  /** Rebuild trades for these positions (open/closed status may have changed). */
  rebuild(accountId: number, positionIds: number[]): Promise<void>;
}

export interface SyncOptions {
  accessToken: string;
  /** Inclusive start; undefined = full history from registration. */
  since?: number;
  now?: number;
  previousOpen?: number[];
  onPhase?: (p: 'authAccount' | 'symbols' | 'positions' | 'history' | 'cashflow') => void;
  onProgress?: (p: number) => void;
}

export async function authAccount(t: Transport, accountId: number, accessToken: string) {
  try {
    await t.send(PT.ACCOUNT_AUTH_REQ, { ctidTraderAccountId: accountId, accessToken });
  } catch (e) {
    if (!(e instanceof CTraderError && e.code === ERR.ALREADY_LOGGED_IN)) throw e;
  }
}

export async function fetchTrader(t: Transport, accountId: number): Promise<TraderInfo> {
  const res = await t.send<Obj>(PT.TRADER_REQ, { ctidTraderAccountId: accountId });
  const tr = (res.trader ?? {}) as Obj;
  const assetId = num(tr.depositAssetId);
  let currency = 'USD';
  try {
    const assets = await t.send<Obj>(PT.ASSET_LIST_REQ, { ctidTraderAccountId: accountId });
    const a = ((assets.asset as Obj[]) ?? []).find((x) => num(x.assetId) === assetId);
    if (a) currency = String(a.name);
  } catch {
    /* keep default */
  }
  return {
    moneyDigits: tr.moneyDigits !== undefined ? num(tr.moneyDigits) : 2,
    balanceU: num(tr.balance),
    depositAssetId: assetId,
    currency,
    broker: tr.brokerName as string | undefined,
    traderLogin: tr.traderLogin !== undefined ? num(tr.traderLogin) : undefined,
    registrationTimestamp: tr.registrationTimestamp !== undefined ? num(tr.registrationTimestamp) : undefined,
  };
}

/** Full or incremental sync of one account. Idempotent: deals are upserted by (accountId, dealId). */
export async function syncAccount(t: Transport, store: SyncStore, accountId: number, o: SyncOptions) {
  const now = o.now ?? Date.now();
  o.onPhase?.('authAccount');
  await authAccount(t, accountId, o.accessToken);
  const trader = await fetchTrader(t, accountId);

  o.onPhase?.('symbols');
  const sym = await t.send<Obj>(PT.SYMBOLS_LIST_REQ, { ctidTraderAccountId: accountId, includeArchivedSymbols: true });
  const symbols = [
    ...((sym.symbol as Obj[]) ?? []).map((s) => ({ symbolId: num(s.symbolId), name: String(s.symbolName ?? `#${s.symbolId}`) })),
    ...((sym.archivedSymbol as Obj[]) ?? []).map((s) => ({ symbolId: num(s.symbolId), name: String(s.name ?? `#${s.symbolId}`) })),
  ];
  await store.saveSymbols(accountId, symbols);

  o.onPhase?.('positions');
  const rec = await t.send<Obj>(PT.RECONCILE_REQ, { ctidTraderAccountId: accountId });
  const openIds = ((rec.position as Obj[]) ?? []).map((p) => num(p.positionId));
  await store.saveAccount(accountId, { openPositionIds: openIds, currency: trader.currency, moneyDigits: trader.moneyDigits, balanceU: trader.balanceU, broker: trader.broker ?? 'cTrader', traderLogin: trader.traderLogin, registrationTimestamp: trader.registrationTimestamp });

  const full = o.since === undefined;
  const start = full ? Math.max(0, (trader.registrationTimestamp ?? now - 5 * 365 * 86_400_000) - 86_400_000) : Math.max(0, o.since! - LIMITS.incrementalOverlapMs);
  const end = Math.min(now + 60_000, LIMITS.maxTimestamp);
  const dealChunks = planChunks(start, end, LIMITS.dealListMaxRangeMs);
  const cashChunks = planChunks(start, end, LIMITS.cashFlowMaxRangeMs);
  const total = dealChunks.length + cashChunks.length;
  let done = 0;
  let cursor = o.since ?? start;

  o.onPhase?.('history');
  const touched = new Set<number>([...openIds, ...(o.previousOpen ?? [])]);
  for (const c of dealChunks) {
    const deals = await fetchDeals(t, accountId, c);
    if (deals.length) {
      await store.saveDeals(accountId, deals);
      for (const d of deals) {
        touched.add(d.positionId);
        cursor = Math.max(cursor, d.executionTimestamp);
      }
    }
    o.onProgress?.(++done / total);
  }

  o.onPhase?.('cashflow');
  for (const c of cashChunks) {
    const res = await t.send<Obj>(PT.CASH_FLOW_HISTORY_LIST_REQ, { ctidTraderAccountId: accountId, fromTimestamp: c.from, toTimestamp: c.to });
    const rows = ((res.depositWithdraw as Obj[]) ?? []).map((r) => normalizeCashFlow(accountId, r, trader.moneyDigits));
    if (rows.length) await store.saveCashFlows(rows);
    o.onProgress?.(++done / total);
  }

  await store.rebuild(accountId, [...touched]);
  await store.saveAccount(accountId, { lastSyncedAt: now, syncCursor: Math.max(cursor, now - LIMITS.incrementalOverlapMs), firstSyncDone: true });
  return { trader, openIds, dealsTouched: touched.size };
}
