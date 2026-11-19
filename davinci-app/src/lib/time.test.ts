import { describe, expect, it } from 'vitest';
import { dayKey, monthGrid, addDays, startOfWeekKey, periodRange, daysInMonth, isoWeekdayInTz, addMonths } from './time';

describe('dayKey in timezone', () => {
  it('trades near midnight land on the local day', () => {
    const ts = Date.UTC(2026, 0, 15, 22, 30); // 22:30 UTC
    expect(dayKey(ts, 'UTC')).toBe('2026-01-15');
    expect(dayKey(ts, 'Europe/Istanbul')).toBe('2026-01-16'); // UTC+3 → 01:30 next day
    expect(dayKey(ts, 'America/New_York')).toBe('2026-01-15');
    expect(dayKey(Date.UTC(2026, 0, 16, 4, 59), 'America/New_York')).toBe('2026-01-15'); // 23:59 EST
    expect(dayKey(Date.UTC(2026, 0, 16, 5, 0), 'America/New_York')).toBe('2026-01-16');
  });

  it('handles DST transitions (Europe/Berlin, 29 Mar 2026 and 25 Oct 2026)', () => {
    // Spring forward: 23:30 local on 28 Mar = 22:30 UTC (CET, +1)
    expect(dayKey(Date.UTC(2026, 2, 28, 22, 30), 'Europe/Berlin')).toBe('2026-03-28');
    expect(dayKey(Date.UTC(2026, 2, 28, 23, 0), 'Europe/Berlin')).toBe('2026-03-29');
    // After switch to CEST (+2): 22:30 UTC on 29 Mar = 00:30 on 30 Mar
    expect(dayKey(Date.UTC(2026, 2, 29, 22, 30), 'Europe/Berlin')).toBe('2026-03-30');
    expect(dayKey(Date.UTC(2026, 2, 29, 21, 59), 'Europe/Berlin')).toBe('2026-03-29');
    // Fall back: 25 Oct, 22:59 UTC = 23:59 CET
    expect(dayKey(Date.UTC(2026, 9, 25, 22, 59), 'Europe/Berlin')).toBe('2026-10-25');
    expect(dayKey(Date.UTC(2026, 9, 25, 23, 0), 'Europe/Berlin')).toBe('2026-10-26');
  });

  it('weekday in tz', () => {
    // Sunday 22:30 UTC is Monday in Istanbul
    expect(isoWeekdayInTz(Date.UTC(2026, 2, 1, 22, 30), 'Europe/Istanbul')).toBe(1);
    expect(isoWeekdayInTz(Date.UTC(2026, 2, 1, 22, 30), 'UTC')).toBe(7);
  });
});

describe('month grid', () => {
  it('is always 6×7 and starts on the configured weekday', () => {
    for (let m = 1; m <= 12; m++) {
      for (const ws of [0, 1, 6]) {
        const g = monthGrid(2026, m, ws);
        expect(g.length).toBe(6);
        g.forEach((row) => expect(row.length).toBe(7));
        expect(g[0]![0]!.weekday).toBe(ws);
        const inMonth = g.flat().filter((c) => c.inMonth);
        expect(inMonth.length).toBe(daysInMonth(2026, m));
        expect(inMonth[0]!.day).toBe(1);
        // consecutive days
        const flat = g.flat();
        for (let i = 1; i < flat.length; i++) expect(addDays(flat[i - 1]!.key, 1)).toBe(flat[i]!.key);
      }
    }
  });

  it('February 2026 starting Monday: 23 Feb … first row starts 26 Jan', () => {
    const g = monthGrid(2026, 2, 1);
    expect(g[0]![0]!.key).toBe('2026-01-26');
    expect(g[0]![0]!.inMonth).toBe(false);
    expect(g[0]![6]!.key).toBe('2026-02-01');
  });

  it('leap year', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(monthGrid(2028, 2, 1).flat().filter((c) => c.inMonth).length).toBe(29);
  });

  it('addDays across DST is calendar-exact', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths(2026, 12, 1)).toEqual({ y: 2027, m: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ y: 2025, m: 12 });
  });
});

describe('periods', () => {
  it('week / month / last30 / ytd', () => {
    expect(startOfWeekKey('2026-11-19', 1)).toBe('2026-11-16'); // Thu → Mon
    expect(startOfWeekKey('2026-11-22', 1)).toBe('2026-11-16'); // Sun → Mon
    expect(startOfWeekKey('2026-11-22', 0)).toBe('2026-11-22');
    expect(periodRange('month', '2026-11-19', 1)).toEqual({ from: '2026-11-01', to: '2026-11-19' });
    expect(periodRange('last30', '2026-11-19', 1)).toEqual({ from: '2026-10-21', to: '2026-11-19' });
    expect(periodRange('ytd', '2026-11-19', 1)).toEqual({ from: '2026-01-01', to: '2026-11-19' });
  });
});
