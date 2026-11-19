import { useMemo } from 'react';
import type { Derived } from '../../hooks/useData';
import { maxAbsInYear, monthSummary } from '../../lib/aggregate';
import { monthGrid, weekdayOrder } from '../../lib/time';
import { pnlTint, tintBackground } from '../../lib/colorScale';
import { fromUnits } from '../../lib/money';
import { formatMoney, formatCompact } from '../../lib/format';
import { strings, fmt } from '../../i18n';
import { toneClass } from '../../components/Money';

/** 12 mini months as a heatmap. One color reference for the whole year (same scale function). */
export function YearView({ y, d, onPickMonth }: { y: number; d: Derived; onPickMonth: (m: number) => void }) {
  const ref = useMemo(() => maxAbsInYear(y, d.days), [y, d.days]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ m: i + 1, grid: monthGrid(y, i + 1, d.weekStartsOn), s: monthSummary(y, i + 1, d.days) })), [y, d]);
  const yearNet = months.reduce((a, x) => a + x.s.netU, 0);
  const order = weekdayOrder(d.weekStartsOn);
  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
        <span className="label">{y}</span>
        <span className={`num text-[22px] font-semibold ${toneClass(yearNet)}`}>{formatMoney(fromUnits(yearNet, d.digits), d.currency, { sign: true })}</span>
        <span className="text-[13px] text-muted">{fmt(strings.calendar.daysN, { n: months.reduce((a, x) => a + x.s.tradingDays, 0) })}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {months.map(({ m, grid, s }) => (
          <button key={m} onClick={() => onPickMonth(m)} className="card min-w-0 p-3 text-left transition-colors hover:border-line/20">
            <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2">
              <span className="truncate text-[13px] font-semibold">{strings.months.long[m - 1]}</span>
              <span className={`num truncate text-[12px] font-medium ${s.tradingDays ? toneClass(s.netU) : 'text-faint'}`}>{s.tradingDays ? formatCompact(fromUnits(s.netU, d.digits)) : '—'}</span>
            </div>
            <div className="grid grid-cols-7 gap-[3px]" aria-hidden="true">
              {order.map((wd) => (
                <span key={wd} className="text-center text-[8.5px] text-faint">{strings.weekdays.narrow[wd]}</span>
              ))}
              {grid.flat().map((c) => {
                const st = c.inMonth ? d.days.get(c.key) : undefined;
                const t = pnlTint(st?.netU ?? 0, ref, !!st && st.count > 0);
                return <span key={c.key} className={`aspect-square rounded-[3px] ${c.inMonth ? (st ? '' : 'bg-surface3/50') : ''} ${c.key === d.today ? 'ring-1 ring-accent' : ''}`} style={st ? { background: tintBackground(t) } : undefined} />;
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
