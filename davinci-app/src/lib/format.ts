const nfCache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, opts: Intl.NumberFormatOptions) {
  const k = locale + JSON.stringify(opts);
  let f = nfCache.get(k);
  if (!f) nfCache.set(k, (f = new Intl.NumberFormat(locale, opts)));
  return f;
}

export const LOCALE = 'tr-TR';

/** "+1.234,56 $" style. Uses a true minus sign. */
export function formatMoney(value: number, currency: string, opts: { sign?: boolean; digits?: number } = {}): string {
  const digits = opts.digits ?? 2;
  let s: string;
  try {
    s = nf(LOCALE, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: opts.sign ? 'exceptZero' : 'auto' }).format(value);
  } catch {
    s = nf(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: opts.sign ? 'exceptZero' : 'auto' }).format(value) + ' ' + currency;
  }
  return s.replace('-', '−');
}

/**
 * Compact P&L for tight spaces: +1.2K, −350, +12K, +1.3M. Always ≤ 6 characters + sign.
 */
export function formatCompact(value: number, opts: { sign?: boolean } = { sign: true }): string {
  const abs = Math.abs(value);
  const sign = value > 0 ? (opts.sign ? '+' : '') : value < 0 ? '−' : '';
  let body: string;
  if (abs < 1000) body = abs >= 100 ? String(Math.round(abs)) : trim(abs.toFixed(abs >= 10 ? 0 : 1));
  else if (abs < 1e6) body = scaled(abs / 1e3) + 'K';
  else if (abs < 1e9) body = scaled(abs / 1e6) + 'M';
  else body = scaled(abs / 1e9) + 'B';
  if (body === '0' || body === '0.0') return '0';
  return sign + body;
}

function scaled(v: number): string {
  // 1.2, 12, 123 — one decimal only below 10; rounding up 9.95 → "10".
  if (v < 9.95) return trim(v.toFixed(1));
  return String(Math.round(v) >= 1000 ? 999 : Math.round(v));
}
const trim = (s: string) => (s.endsWith('.0') ? s.slice(0, -2) : s);

export function formatPercent(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return nf(LOCALE, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

export function formatNumber(v: number | null, digits = 2): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return nf(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

export function formatVolume(units: number): string {
  // cTrader shows lots for FX (100k units); we show units with compact suffix to stay asset-agnostic.
  return nf(LOCALE, { maximumFractionDigits: 2, notation: units >= 1e6 ? 'compact' : 'standard' }).format(units);
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}sn`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa ${m % 60}dk`;
  const d = Math.floor(h / 24);
  return `${d}g ${h % 24}sa`;
}

export function formatPrice(p: number | null): string {
  if (p === null || !Number.isFinite(p)) return '—';
  const digits = p >= 1000 ? 2 : p >= 10 ? 3 : 5;
  return nf(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: digits }).format(p);
}

export const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', TRY: '₺', JPY: '¥', CHF: 'CHF' };

import { formatInTimeZone } from 'date-fns-tz';
import { tr as trLocale } from 'date-fns/locale';
/** Date formatting in the user's timezone with the Turkish locale. */
export function formatDate(ts: number, tz: string, pattern: string): string {
  return formatInTimeZone(ts, tz, pattern, { locale: trLocale });
}
