import { db, type AccountRow } from './db';
import type { CashFlow, JournalEntry, RawDeal, Settings, Trade } from '../lib/types';
import { buildTrade, groupByPosition } from '../lib/pnl';
import { deviceTimezone } from '../lib/time';
import { generateSampleData, SAMPLE_ACCOUNT_ID } from '../lib/demo';

// ---- settings ---------------------------------------------------------------
export const DEFAULT_SETTINGS: Settings = {
  timezone: deviceTimezone(),
  weekStartsOn: 1,
  currencyDisplay: 'symbol',
  showWinRateInCalendar: false,
  demoData: false,
};

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const cur = await getSettings();
  await db.kv.put({ key: 'settings', value: { ...cur, ...patch } });
}

// ---- credentials (device-local only) -----------------------------------------
export interface Credentials {
  clientId: string;
  clientSecret: string;
  environment: 'demo' | 'live';
}
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

export async function getCredentials(): Promise<Credentials | null> {
  return ((await db.kv.get('ctrader.credentials'))?.value as Credentials) ?? null;
}
export async function saveCredentials(c: Credentials) {
  await db.kv.put({ key: 'ctrader.credentials', value: c });
}
export async function getTokens(): Promise<Tokens | null> {
  return ((await db.kv.get('ctrader.tokens'))?.value as Tokens) ?? null;
}
export async function saveTokens(t: Tokens) {
  await db.kv.put({ key: 'ctrader.tokens', value: t });
}
export async function wipeCredentials() {
  await db.kv.bulkDelete(['ctrader.credentials', 'ctrader.tokens', 'ctrader.oauthState']);
}

// ---- symbols ----------------------------------------------------------------
export async function symbolMap(accountId: number): Promise<Map<number, string>> {
  const rows = await db.symbols.where('accountId').equals(accountId).toArray();
  return new Map(rows.map((r) => [r.symbolId, r.name]));
}

export async function saveSymbols(accountId: number, list: { symbolId: number; name: string }[]) {
  await db.symbols.bulkPut(list.map((s) => ({ key: `${accountId}:${s.symbolId}`, accountId, symbolId: s.symbolId, name: s.name })));
}

// ---- deals → trades ---------------------------------------------------------
/** Upsert deals by (accountId, dealId) and rebuild only the positions they touch. Idempotent. */
export async function upsertDeals(accountId: number, deals: RawDeal[]): Promise<number> {
  if (!deals.length) return 0;
  await db.deals.bulkPut(deals);
  const positions = [...new Set(deals.map((d) => d.positionId))];
  await rebuildPositions(accountId, positions);
  return positions.length;
}

export async function rebuildPositions(accountId: number, positionIds: number[]) {
  const account = await db.accounts.get(accountId);
  const symbols = await symbolMap(accountId);
  const openPositions = new Set((account?.openPositionIds ?? []).map((p) => `${accountId}:${p}`));
  const accountDigits = new Map([[accountId, account?.moneyDigits ?? 2]]);
  const deals = await db.deals.where('[accountId+positionId]').anyOf(positionIds.map((p) => [accountId, p])).toArray();
  const groups = groupByPosition(deals);
  const trades: Trade[] = [];
  for (const [key, ds] of groups) trades.push(buildTrade(key, ds, { symbols, openPositions, accountDigits }).trade);
  await db.transaction('rw', db.trades, async () => {
    await db.trades.bulkDelete(positionIds.map((p) => `${accountId}:${p}`));
    await db.trades.bulkPut(trades);
  });
}

export async function rebuildAccount(accountId: number) {
  const deals = await db.deals.where('accountId').equals(accountId).toArray();
  await db.trades.where('accountId').equals(accountId).delete();
  await rebuildPositions(accountId, [...new Set(deals.map((d) => d.positionId))]);
}

export async function upsertCashFlows(rows: CashFlow[]) {
  if (rows.length) await db.cashflows.bulkPut(rows);
}

// ---- journal ----------------------------------------------------------------
export function emptyJournal(kind: 'trade' | 'day', ref: string): JournalEntry {
  return { id: `${kind}:${ref}`, kind, ref, note: '', tags: [], mistakes: [], updatedAt: 0 };
}

export async function saveJournal(entry: JournalEntry) {
  await db.journal.put({ ...entry, updatedAt: Date.now() });
}

// ---- sample data ------------------------------------------------------------
export async function loadSampleData() {
  const data = generateSampleData();
  await removeAccountData(SAMPLE_ACCOUNT_ID);
  await db.accounts.put({ ...data.account, openPositionIds: [...data.openPositions].map((k) => Number(k.split(':')[1])) });
  await saveSymbols(SAMPLE_ACCOUNT_ID, [...data.symbols].map(([symbolId, name]) => ({ symbolId, name })));
  await db.cashflows.bulkPut(data.cashFlows);
  await upsertDeals(SAMPLE_ACCOUNT_ID, data.deals);
  await db.journal.bulkPut(
    data.journal.map((j) => ({
      id: `trade:${SAMPLE_ACCOUNT_ID}:${j.tradePositionId}`,
      kind: 'trade' as const,
      ref: `${SAMPLE_ACCOUNT_ID}:${j.tradePositionId}`,
      note: j.note,
      tags: j.tags,
      setup: j.setup,
      rating: j.rating,
      mistakes: j.mistakes,
      updatedAt: Date.now(),
    })),
  );
  await saveSettings({ demoData: true });
}

export async function removeAccountData(accountId: number) {
  await db.transaction('rw', [db.accounts, db.deals, db.trades, db.cashflows, db.symbols, db.journal], async () => {
    await db.deals.where('accountId').equals(accountId).delete();
    await db.trades.where('accountId').equals(accountId).delete();
    await db.cashflows.where('accountId').equals(accountId).delete();
    await db.symbols.where('accountId').equals(accountId).delete();
    await db.journal.filter((j) => j.kind === 'trade' && j.ref.startsWith(`${accountId}:`)).delete();
    await db.accounts.delete(accountId);
  });
}

export async function removeSampleData() {
  await removeAccountData(SAMPLE_ACCOUNT_ID);
  await saveSettings({ demoData: false });
}

// ---- backup -----------------------------------------------------------------
export interface Backup {
  app: 'davinci';
  version: 1;
  exportedAt: number;
  accounts: AccountRow[];
  deals: RawDeal[];
  cashflows: CashFlow[];
  symbols: unknown[];
  journal: JournalEntry[];
  settings: Settings;
}

/** Credentials and tokens are never exported. */
export async function exportBackup(): Promise<Backup> {
  return {
    app: 'davinci',
    version: 1,
    exportedAt: Date.now(),
    accounts: await db.accounts.toArray(),
    deals: await db.deals.toArray(),
    cashflows: await db.cashflows.toArray(),
    symbols: await db.symbols.toArray(),
    journal: await db.journal.toArray(),
    settings: await getSettings(),
  };
}

export async function importBackup(b: Backup) {
  if (b?.app !== 'davinci' || b.version !== 1) throw new Error('invalid-backup');
  await db.transaction('rw', [db.accounts, db.deals, db.cashflows, db.symbols, db.journal, db.kv], async () => {
    await db.accounts.bulkPut(b.accounts);
    await db.deals.bulkPut(b.deals);
    await db.cashflows.bulkPut(b.cashflows);
    await db.symbols.bulkPut(b.symbols as never[]);
    await db.journal.bulkPut(b.journal);
    await db.kv.put({ key: 'settings', value: b.settings });
  });
  for (const a of b.accounts) await rebuildAccount(a.id);
}

export async function wipeAll() {
  await db.delete();
  await db.open();
}

export type { AccountRow };
