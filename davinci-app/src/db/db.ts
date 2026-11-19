import Dexie, { type Table } from 'dexie';
import type { Account, CashFlow, JournalEntry, RawDeal, Trade } from '../lib/types';

export interface SymbolRow {
  key: string; // `${accountId}:${symbolId}`
  accountId: number;
  symbolId: number;
  name: string;
}

export interface KV {
  key: string;
  value: unknown;
}

export interface AccountRow extends Account {
  openPositionIds?: number[];
}

export class DaVinciDB extends Dexie {
  accounts!: Table<AccountRow, number>;
  deals!: Table<RawDeal, string>;
  trades!: Table<Trade, string>;
  cashflows!: Table<CashFlow, string>;
  symbols!: Table<SymbolRow, string>;
  journal!: Table<JournalEntry, string>;
  kv!: Table<KV, string>;

  constructor(name = 'davinci') {
    super(name);
    this.version(1).stores({
      accounts: 'id',
      deals: 'key, accountId, [accountId+positionId], executionTimestamp',
      trades: 'key, accountId, closeTime, openTime, symbol, status',
      cashflows: 'key, accountId, time',
      symbols: 'key, accountId',
      journal: 'id, kind',
      kv: 'key',
    });
  }
}

export const db = new DaVinciDB();
