import { Fragment } from 'react';
import type { DayMap, MonthView } from '../../lib/aggregate';
import { weekdayOrder } from '../../lib/time';
import { fromUnits } from '../../lib/money';
import { strings, fmt } from '../../i18n';
import { DayCell } from './DayCell';
import { SplitAmount, toneClass } from '../../components/Money';

export interface MonthGridProps {
  view: MonthView;
  days: DayMap;
  digits: number;
  currency: string;
  today: string;
  weekStartsOn: number;
  showWinRate: boolean;
  variant?: 'full' | 'compact';
  showWeeks?: boolean;
  onSelectDay?: (key: string) => void;
}

export function MonthGrid({ view, days, digits, currency, today, weekStartsOn, showWinRate, variant = 'full', showWeeks = true, onSelectDay }: MonthGridProps) {
  const order = weekdayOrder(weekStartsOn);
  const weekCol = variant === 'full' && showWeeks;
  const cols = weekCol ? 'grid-cols-7 sm:grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.05fr)]' : 'grid-cols-7';
  const gap = variant === 'full' ? 'gap-[3px] sm:gap-1.5' : 'gap-1';

  return (
    <div className="min-w-0">
      <div className={`grid ${cols} ${gap} mb-1.5`} aria-hidden="true">
        {order.map((wd) => (
          <div key={wd} className={`min-w-0 truncate text-center text-[11px] font-medium uppercase tracking-wider sm:text-[11.5px] ${wd === 0 || wd === 6 ? 'text-faint' : 'text-muted'}`}>
            <span className={variant === 'full' ? 'hidden sm:inline' : 'hidden'}>{strings.weekdays.short[wd]}</span>
            <span className={variant === 'full' ? 'sm:hidden' : ''}>{strings.weekdays.narrow[wd]}</span>
          </div>
        ))}
        {weekCol && <div className="hidden min-w-0 truncate text-center text-[11.5px] font-medium uppercase tracking-wider text-muted sm:block">{strings.calendar.week}</div>}
      </div>
      <div className={`grid ${cols} ${gap}`} role="group" aria-label={`${strings.months.long[view.m - 1]} ${view.y}`}>
        {view.grid.map((row, wi) => (
          <Fragment key={wi}>
            {row.map((cell) => (
              <DayCell
                key={cell.key}
                cell={cell}
                stat={days.get(cell.key)}
                maxAbsU={view.summary.maxAbsU}
                digits={digits}
                currency={currency}
                isToday={cell.key === today}
                showWinRate={showWinRate}
                variant={variant}
                onSelect={onSelectDay}
              />
            ))}
            {weekCol && <WeekCell index={wi} netU={view.weeks[wi]!.netU} trades={view.weeks[wi]!.trades} tradingDays={view.weeks[wi]!.tradingDays} digits={digits} currency={currency} />}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function WeekCell({ index, netU, trades, tradingDays, digits, currency }: { index: number; netU: number; trades: number; tradingDays: number; digits: number; currency: string }) {
  const v = fromUnits(netU, digits);
  return (
    <div className="cal-cell relative hidden min-w-0 overflow-hidden rounded-[10px] border border-line/[0.07] bg-surface2/70 sm:block">
      <span className="absolute left-2.5 top-2 text-[11px] font-medium text-muted">
        {strings.calendar.weekShort}
        {index + 1}
      </span>
      {trades > 0 ? (
        <div className="absolute inset-x-2.5 bottom-2 flex flex-col items-end gap-0.5">
          <SplitAmount value={v} mode="narrow" className={`v-narrow max-w-full text-[12.5px] font-semibold leading-none ${toneClass(v)}`} />
          <SplitAmount value={v} mode="wide" className={`v-wide max-w-full text-[13.5px] font-semibold leading-none ${toneClass(v)}`} />
          <SplitAmount value={v} mode="wide" currency={currency} className={`v-full max-w-full text-[15px] font-semibold leading-tight ${toneClass(v)}`} />
          <span className="v-count num max-w-full truncate text-[11px] leading-tight text-muted">
            {fmt(strings.calendar.tradesN, { n: trades })} · {fmt(strings.calendar.daysN, { n: tradingDays })}
          </span>
        </div>
      ) : (
        <span className="absolute bottom-2 right-2.5 text-[12px] text-faint">—</span>
      )}
    </div>
  );
}

/** Phone: weekly totals as a compact strip under the grid. */
export function WeekStrip({ view, digits }: { view: MonthView; digits: number }) {
  const weeks = view.weeks.filter((w) => w.hasMonthDays);
  return (
    <div className="mt-3 px-1 sm:hidden">
      <p className="label mb-1.5">{strings.calendar.weekTotals}</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((w) => {
          const v = fromUnits(w.netU, digits);
          return (
            <div key={w.index} className="min-w-0 rounded-[8px] border border-line/[0.07] bg-surface px-0.5 py-1.5 text-center">
              <div className="text-[10px] text-muted">
                {strings.calendar.weekShort}
                {w.index + 1}
              </div>
              <div className={`truncate text-[11.5px] font-semibold ${w.trades ? toneClass(v) : 'text-faint'}`}>{w.trades ? <SplitAmount value={v} mode="narrow" className="tracking-[-0.02em]" /> : '—'}</div>
              <div className="num text-[10px] text-muted">{w.trades ? `${w.trades}` : ' '}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
