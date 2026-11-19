import { describe, expect, it } from 'vitest';
import { fetchDeals, planChunks, syncAccount, type SyncStore } from './sync';
import { PT } from './constants';
import type { Transport } from './client';
import type { CashFlow, RawDeal } from '../lib/types';

const WEEK = 604_800_000;

describe('planChunks', () => {
  it('covers the range with no gaps or overlaps', () => {
    const c = planChunks(0, WEEK * 2.5, WEEK);
    expect(c).toEqual([{ from: 0, to: WEEK }, { from: WEEK, to: 2 * WEEK }, { from: 2 * WEEK, to: 2.5 * WEEK }]);
  });
});

/** Fake server: returns deals in range, at most `maxRows` per response with hasMore. */
function fakeServer(deals: Record<string, unknown>[], maxRows = 3) {
  const log: { pt: number; payload: Record<string, unknown> }[] = [];
  const t: Transport = {
    async send<T>(pt: number, payload: Record<string, unknown>) {
      log.push({ pt, payload });
      if (pt === PT.DEAL_LIST_REQ) {
        const inRange = deals.filter((d) => (d.executionTimestamp as number) >= (payload.fromTimestamp as number) && (d.executionTimestamp as number) < (payload.toTimestamp as number));
        return { deal: inRange.slice(0, maxRows), hasMore: inRange.length > maxRows } as T;
      }
      if (pt === PT.TRADER_REQ) return { trader: { moneyDigits: 2, balance: 100_000, depositAssetId: 15, registrationTimestamp: 1000, brokerName: 'X' } } as T;
      if (pt === PT.ASSET_LIST_REQ) return { asset: [{ assetId: 15, name: 'EUR' }] } as T;
      if (pt === PT.SYMBOLS_LIST_REQ) return { symbol: [{ symbolId: 1, symbolName: 'EURUSD' }], archivedSymbol: [{ symbolId: 9, name: 'OLD' }] } as T;
      if (pt === PT.RECONCILE_REQ) return { position: [{ positionId: '42' }] } as T;
      if (pt === PT.CASH_FLOW_HISTORY_LIST_REQ) {
        // enforce the documented 1-week limit
        expect((payload.toTimestamp as number) - (payload.fromTimestamp as number)).toBeLessThanOrEqual(WEEK);
        return { depositWithdraw: (payload.fromTimestamp as number) <= 5000 && (payload.toTimestamp as number) > 5000 ? [{ operationType: 'BALANCE_DEPOSIT', balanceHistoryId: 1, balance: 100_000, delta: 100_000, changeBalanceTimestamp: 5000 }] : [] } as T;
      }
      return {} as T;
    },
  };
  return { t, log };
}

const mkDeal = (i: number, ts: number) => ({ dealId: String(i), orderId: i, positionId: Math.ceil(i / 2), volume: 100, filledVolume: 100, symbolId: 1, createTimestamp: ts, executionTimestamp: ts, tradeSide: 'BUY', dealStatus: 'FILLED' });

describe('fetchDeals', () => {
  it('splits ranges on hasMore and returns every deal exactly once', async () => {
    const deals = Array.from({ length: 25 }, (_, i) => mkDeal(i + 1, 10_000 + i * 997));
    const { t } = fakeServer(deals, 4);
    const got = await fetchDeals(t, 5, { from: 0, to: WEEK });
    expect(got.length).toBe(25);
    expect(new Set(got.map((d) => d.dealId)).size).toBe(25);
    expect(got[0]!.tradeSide).toBe(1);
    expect(got[0]!.dealStatus).toBe(2);
  });
});

describe('syncAccount', () => {
  it('full sync stores deals, cash flows, symbols and account info; incremental is idempotent', async () => {
    const now = 3 * WEEK;
    const deals = Array.from({ length: 10 }, (_, i) => mkDeal(i + 1, 2000 + i * WEEK * 0.25));
    const { t, log } = fakeServer(deals, 3);
    const db = { deals: new Map<string, RawDeal>(), cash: new Map<string, CashFlow>(), account: {} as Record<string, unknown>, symbols: 0, rebuilt: new Set<number>() };
    const store: SyncStore = {
      async saveDeals(_a, ds) { ds.forEach((d) => db.deals.set(d.key, d)); },
      async saveCashFlows(rows) { rows.forEach((r) => db.cash.set(r.key, r)); },
      async saveSymbols(_a, list) { db.symbols = list.length; },
      async saveAccount(_a, p) { Object.assign(db.account, p); },
      async rebuild(_a, ids) { ids.forEach((i) => db.rebuilt.add(i)); },
    };
    await syncAccount(t, store, 5, { accessToken: 'x', now });
    expect(db.deals.size).toBe(10);
    expect(db.cash.size).toBe(1);
    expect(db.symbols).toBe(2);
    expect(db.account.currency).toBe('EUR');
    expect(db.account.openPositionIds).toEqual([42]);
    expect(db.rebuilt.has(42)).toBe(true);
    expect(log[0]!.pt).toBe(PT.ACCOUNT_AUTH_REQ);

    const before = log.length;
    await syncAccount(t, store, 5, { accessToken: 'x', now, since: db.account.syncCursor as number });
    expect(db.deals.size).toBe(10); // no duplicates
    const incDealReqs = log.slice(before).filter((l) => l.pt === PT.DEAL_LIST_REQ);
    expect(incDealReqs.length).toBeLessThanOrEqual(2);
  });
});
