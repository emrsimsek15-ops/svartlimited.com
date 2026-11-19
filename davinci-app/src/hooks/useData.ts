import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db/db';
import { DEFAULT_SETTINGS, getSettings } from '../db/repo';
import { useUI } from '../store/ui';
import { commonDigits, dailyMap, filterByRange, type DayMap } from '../lib/aggregate';
import { periodRange, todayKey, type DayRange } from '../lib/time';
import type { JournalEntry, Settings, Trade } from '../lib/types';
import type { AccountRow } from '../db/db';

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS);
}

export function useAccounts(): AccountRow[] | undefined {
  return useLiveQuery(() => db.accounts.toArray(), []);
}

/** All trades of enabled accounts matching the account filter. `undefined` while loading. */
export function useTrades(): Trade[] | undefined {
  const filter = useUI((s) => s.accountFilter);
  const accounts = useAccounts();
  const all = useLiveQuery(() => db.trades.toArray(), []);
  return useMemo(() => {
    if (!all || !accounts) return undefined;
    const enabled = new Set(accounts.filter((a) => a.enabled).map((a) => a.id));
    return all
      .filter((t) => (filter === 'all' ? enabled.has(t.accountId) : t.accountId === filter))
      .sort((a, b) => (b.closeTime ?? b.openTime) - (a.closeTime ?? a.openTime) || b.positionId - a.positionId);
  }, [all, accounts, filter]);
}

export function useJournalMap(): Map<string, JournalEntry> {
  const rows = useLiveQuery(() => db.journal.toArray(), [], [] as JournalEntry[]);
  return useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
}

export interface Derived {
  trades: Trade[];
  digits: number;
  days: DayMap;
  currency: string;
  mixedCurrency: boolean;
  tz: string;
  weekStartsOn: number;
  today: string;
}

/** Memoized derived data shared by pages. Aggregations live in pure functions in lib/aggregate. */
export function useDerived(): Derived | undefined {
  const trades = useTrades();
  const settings = useSettings();
  const accounts = useAccounts();
  const filter = useUI((s) => s.accountFilter);
  const tz = settings.timezone;
  const digits = useMemo(() => (trades ? commonDigits(trades) : 2), [trades]);
  const days = useMemo(() => (trades ? dailyMap(trades, tz, digits) : new Map()), [trades, tz, digits]);
  return useMemo(() => {
    if (!trades || !accounts) return undefined;
    const relevant = accounts.filter((a) => a.enabled && (filter === 'all' || a.id === filter));
    const currencies = new Set(relevant.map((a) => a.currency));
    return {
      trades,
      digits,
      days,
      currency: relevant[0]?.currency ?? 'USD',
      mixedCurrency: currencies.size > 1,
      tz,
      weekStartsOn: settings.weekStartsOn,
      today: todayKey(tz),
    };
  }, [trades, accounts, filter, digits, days, tz, settings.weekStartsOn]);
}

export function usePeriodRange(d: Derived | undefined): DayRange {
  const period = useUI((s) => s.period);
  const custom = useUI((s) => s.custom);
  return useMemo(() => (d ? periodRange(period, d.today, d.weekStartsOn, custom) : { from: null, to: null }), [d, period, custom]);
}

export function usePeriodTrades(d: Derived | undefined): Trade[] {
  const range = usePeriodRange(d);
  return useMemo(() => (d ? filterByRange(d.trades.filter((t) => t.status === 'closed'), d.tz, range) : []), [d, range]);
}
