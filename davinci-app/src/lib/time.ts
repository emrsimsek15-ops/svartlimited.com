import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/**
 * Calendar dates are handled as plain `yyyy-MM-dd` keys. Converting a timestamp to a key always goes
 * through the user's IANA timezone (date-fns-tz), so DST is handled by the tz database. Arithmetic on
 * plain keys (grid building, adding days) is done on a UTC-anchored date, where every day is 24 h.
 */
export type DayKey = string; // yyyy-MM-dd

const keyCache = new Map<string, Map<number, DayKey>>();

export function dayKey(ts: number, tz: string): DayKey {
  let m = keyCache.get(tz);
  if (!m) keyCache.set(tz, (m = new Map()));
  let k = m.get(ts);
  if (k === undefined) {
    k = formatInTimeZone(ts, tz, 'yyyy-MM-dd');
    if (m.size > 200_000) m.clear();
    m.set(ts, k);
  }
  return k;
}

export function hourInTz(ts: number, tz: string): number {
  return Number(formatInTimeZone(ts, tz, 'H'));
}

/** ISO weekday in tz: 1 = Monday … 7 = Sunday. */
export function isoWeekdayInTz(ts: number, tz: string): number {
  return Number(formatInTimeZone(ts, tz, 'i'));
}

export function todayKey(tz: string, now = Date.now()): DayKey {
  return dayKey(now, tz);
}

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Start-of-day instant (ms) of a day key in tz. */
export function startOfDayTs(key: DayKey, tz: string): number {
  return fromZonedTime(`${key}T00:00:00`, tz).getTime();
}

// ---- plain-date arithmetic -------------------------------------------------
export function parseKey(key: DayKey): { y: number; m: number; d: number } {
  return { y: +key.slice(0, 4), m: +key.slice(5, 7), d: +key.slice(8, 10) };
}

export function makeKey(y: number, m: number, d: number): DayKey {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const utc = (key: DayKey) => {
  const { y, m, d } = parseKey(key);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number): DayKey => {
  const dt = new Date(ms);
  return makeKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
};

export function addDays(key: DayKey, n: number): DayKey {
  return fromUtc(utc(key) + n * 86_400_000);
}

export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((utc(a) - utc(b)) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOfKey(key: DayKey): number {
  return new Date(utc(key)).getUTCDay();
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function startOfWeekKey(key: DayKey, weekStartsOn: number): DayKey {
  const wd = weekdayOfKey(key);
  return addDays(key, -((wd - weekStartsOn + 7) % 7));
}

export function monthKey(key: DayKey): string {
  return key.slice(0, 7);
}

export function addMonths(y: number, m: number, n: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + n;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

// ---- month grid -------------------------------------------------------------
export interface GridCell {
  key: DayKey;
  day: number;
  inMonth: boolean;
  weekday: number; // 0 = Sunday
  isWeekend: boolean;
}

/**
 * Always 6 weeks × 7 days (42 cells). A fixed height keeps the layout stable when navigating months.
 */
export function monthGrid(y: number, m: number, weekStartsOn: number): GridCell[][] {
  const first = makeKey(y, m, 1);
  const start = startOfWeekKey(first, weekStartsOn);
  const weeks: GridCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: GridCell[] = [];
    for (let i = 0; i < 7; i++) {
      const key = addDays(start, w * 7 + i);
      const { y: ky, m: km, d } = parseKey(key);
      const weekday = weekdayOfKey(key);
      row.push({ key, day: d, inMonth: ky === y && km === m, weekday, isWeekend: weekday === 0 || weekday === 6 });
    }
    weeks.push(row);
  }
  return weeks;
}

export function weekdayOrder(weekStartsOn: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7);
}

// ---- periods ----------------------------------------------------------------
export type PeriodId = 'week' | 'month' | 'last30' | 'ytd' | 'all' | 'custom';
export interface DayRange {
  from: DayKey | null; // inclusive
  to: DayKey | null; // inclusive
}

export function periodRange(p: PeriodId, today: DayKey, weekStartsOn: number, custom?: DayRange): DayRange {
  const { y, m } = parseKey(today);
  switch (p) {
    case 'week':
      return { from: startOfWeekKey(today, weekStartsOn), to: today };
    case 'month':
      return { from: makeKey(y, m, 1), to: today };
    case 'last30':
      return { from: addDays(today, -29), to: today };
    case 'ytd':
      return { from: makeKey(y, 1, 1), to: today };
    case 'all':
      return { from: null, to: null };
    case 'custom':
      return custom ?? { from: null, to: null };
  }
}

export function inRange(key: DayKey, r: DayRange): boolean {
  return (r.from === null || key >= r.from) && (r.to === null || key <= r.to);
}
