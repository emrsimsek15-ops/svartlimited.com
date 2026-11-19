import type { MonthSummary } from '../../lib/aggregate';
import { fromUnits } from '../../lib/money';
import { formatMoney } from '../../lib/format';
import { parseKey } from '../../lib/time';
import { strings } from '../../i18n';
import { toneClass } from '../../components/Money';
import { CountUp } from '../../components/CountUp';
import { useCallback } from 'react';

export function MonthStats({ s, digits, currency }: { s: MonthSummary; digits: number; currency: string }) {
  const net = fromUnits(s.netU, digits);
  const fmtNet = useCallback((v: number) => formatMoney(v, currency, { sign: true }), [currency]);
  const day = (k: string) => {
    const { d, m } = parseKey(k);
    return `${d} ${strings.months.short[m - 1]}`;
  };
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line/[0.07] bg-line/[0.06] md:grid-cols-5">
      <Stat label={strings.calendar.netMonth} className="col-span-2 md:col-span-1">
        <CountUp value={net} format={fmtNet} className={`text-[22px] font-semibold tracking-[-0.01em] sm:text-[24px] ${toneClass(net)}`} />
      </Stat>
      <Stat label={strings.calendar.tradingDays}>
        <span className="num text-[18px] font-semibold">{s.tradingDays}</span>
        <span className="num ml-1.5 text-[12px] text-muted">· {s.trades} {strings.common.trades}</span>
      </Stat>
      <Stat label={strings.calendar.greenRed}>
        <span className="num text-[18px] font-semibold text-profit">{s.greenDays}</span>
        <span className="mx-1 text-faint">/</span>
        <span className="num text-[18px] font-semibold text-loss">{s.redDays}</span>
      </Stat>
      <Stat label={strings.calendar.best}>
        {s.best ? (
          <>
            <span className="num text-[15px] font-semibold text-profit">{formatMoney(fromUnits(s.best.netU, digits), currency, { sign: true })}</span>
            <span className="ml-1.5 text-[12px] text-muted">{day(s.best.key)}</span>
          </>
        ) : (
          <span className="text-faint">—</span>
        )}
      </Stat>
      <Stat label={strings.calendar.worst}>
        {s.worst ? (
          <>
            <span className="num text-[15px] font-semibold text-loss">{formatMoney(fromUnits(s.worst.netU, digits), currency, { sign: true })}</span>
            <span className="ml-1.5 text-[12px] text-muted">{day(s.worst.key)}</span>
          </>
        ) : (
          <span className="text-faint">—</span>
        )}
      </Stat>
    </div>
  );
}

function Stat({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 bg-surface px-4 py-3 ${className}`}>
      <div className="label mb-1 truncate">{label}</div>
      <div className="flex min-w-0 flex-wrap items-baseline">{children}</div>
    </div>
  );
}
