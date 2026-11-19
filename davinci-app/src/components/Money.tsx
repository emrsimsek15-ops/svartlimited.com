import { fromUnits } from '../lib/money';
import { formatCompact, formatMoney } from '../lib/format';

export function toneClass(v: number) {
  return v > 0 ? 'text-profit' : v < 0 ? 'text-loss' : 'text-muted';
}

export function Money({ units, digits, currency, sign = true, compact = false, className = '', colored = true }: { units: number; digits: number; currency: string; sign?: boolean; compact?: boolean; className?: string; colored?: boolean }) {
  const v = fromUnits(units, digits);
  return <span className={`num ${colored ? toneClass(v) : ''} ${className}`}>{compact ? formatCompact(v, { sign }) : formatMoney(v, currency, { sign })}</span>;
}
