import { fromUnits } from '../lib/money';
import { amountParts, formatCompact, formatMoney, CURRENCY_SYMBOL } from '../lib/format';

export function toneClass(v: number) {
  return v > 0 ? 'text-profit' : v < 0 ? 'text-loss' : 'text-muted';
}

export function Money({ units, digits, currency, sign = true, compact = false, className = '', colored = true }: { units: number; digits: number; currency: string; sign?: boolean; compact?: boolean; className?: string; colored?: boolean }) {
  const v = fromUnits(units, digits);
  return <span className={`num ${colored ? toneClass(v) : ''} ${className}`}>{compact ? formatCompact(v, { sign }) : formatMoney(v, currency, { sign })}</span>;
}

/** Amount with the cents set smaller and softer: +113<small>,23</small>. Used in calendar cells. */
export function SplitAmount({ value, mode, currency, className = '' }: { value: number; mode: 'narrow' | 'wide'; currency?: string; className?: string }) {
  const sym = currency ? (CURRENCY_SYMBOL[currency] ?? '') : '';
  const { main, frac } = amountParts(value, mode, sym);
  return (
    <span className={`num inline-flex items-baseline whitespace-nowrap ${className}`}>
      <span>{main}</span>
      {frac && <span className="ml-px text-[0.74em] font-medium opacity-75">{frac}</span>}
    </span>
  );
}
