import { memo } from 'react';
import { pnlTint, tintBackground } from '../../lib/colorScale';
import { fromUnits } from '../../lib/money';
import { formatCompact, formatMoney, formatPercent } from '../../lib/format';
import type { DayStat } from '../../lib/aggregate';
import type { GridCell } from '../../lib/time';
import { strings, fmt } from '../../i18n';

export interface DayCellProps {
  cell: GridCell;
  stat: DayStat | undefined;
  maxAbsU: number;
  digits: number;
  currency: string;
  isToday: boolean;
  showWinRate: boolean;
  variant: 'full' | 'compact';
  onSelect?: (key: string) => void;
}

/** One calendar day. Content adapts to the cell's own width via container queries (see index.css). */
export const DayCell = memo(function DayCell({ cell, stat, maxAbsU, digits, currency, isToday, showWinRate, variant, onSelect }: DayCellProps) {
  const has = cell.inMonth && !!stat && stat.count > 0;
  const net = has ? fromUnits(stat!.netU, digits) : 0;
  const tint = pnlTint(has ? stat!.netU : 0, maxAbsU, has);
  const muted = cell.isWeekend && !has;
  const decided = has ? stat!.wins + stat!.losses : 0;
  const wr = decided > 0 ? stat!.wins / decided : null;

  if (!cell.inMonth) {
    return (
      <div className={`cal-cell relative min-w-0 rounded-[10px] ${variant === 'full' ? 'aspect-[5/6] sm:aspect-[4/3.4] xl:aspect-[4/3]' : 'aspect-square'}`} aria-hidden="true">
        <span className={`absolute num text-faint ${variant === 'full' ? 'left-1.5 top-1 text-[11px] sm:left-2.5 sm:top-2 sm:text-[12px]' : 'left-1 top-0.5 text-[10px]'}`}>{cell.day}</span>
      </div>
    );
  }

  const label = has
    ? `${cell.key}: ${formatMoney(net, currency, { sign: true })}, ${fmt(strings.calendar.tradesN, { n: stat!.count })}`
    : `${cell.key}: ${strings.calendar.noTrades}`;

  const textTone = tint.tone === 'profit' ? 'text-white' : tint.tone === 'loss' ? 'text-white' : 'text-text';

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(cell.key)}
        aria-label={label}
        className={`cal-cell relative aspect-square min-w-0 rounded-[8px] border transition-transform duration-150 active:scale-95 ${has ? 'border-transparent' : 'border-line/[0.05]'} ${isToday ? 'ring-1 ring-accent/80' : ''}`}
        style={{ background: has ? tintBackground(tint) : muted ? 'transparent' : 'rgb(var(--surface-2) / 0.5)' }}
      >
        <span className={`absolute left-1 top-0.5 num text-[10px] ${has ? 'text-white/85' : muted ? 'text-faint' : 'text-muted'}`}>{cell.day}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(cell.key)}
      aria-label={label}
      className={`cal-cell group relative aspect-[5/6] min-w-0 overflow-hidden rounded-[10px] border text-left transition-[transform,border-color,background-color] duration-150 ease-out hover:border-line/20 active:scale-[0.97] sm:aspect-[4/3.4] xl:aspect-[4/3] ${has ? 'border-line/[0.06]' : 'border-line/[0.05]'} ${muted ? 'bg-transparent' : has ? '' : 'bg-surface/60'} ${isToday ? 'ring-1 ring-inset ring-accent' : ''}`}
      style={has ? { background: tintBackground(tint) } : undefined}
    >
      <span className={`absolute left-1.5 top-1 num text-[11px] font-medium sm:left-2.5 sm:top-2 sm:text-[12px] ${isToday && !has ? 'text-accent' : has ? 'text-white' : muted ? 'text-faint' : 'text-muted'}`}>{cell.day}</span>
      {has && (
        <div className={`absolute inset-x-1 bottom-1 flex flex-col items-end gap-0.5 sm:inset-x-2.5 sm:bottom-2 ${textTone}`}>
          <span className="v-compact num max-w-full truncate text-[10.5px] font-semibold leading-none sm:text-[13px]">{formatCompact(net)}</span>
          <span className="v-full num max-w-full truncate text-[14.5px] font-semibold leading-tight">{formatMoney(net, currency, { sign: true, digits: Math.abs(net) >= 1000 ? 0 : 2 })}</span>
          <span className="v-count num max-w-full truncate text-[11px] leading-tight text-white">
            {fmt(strings.calendar.tradesN, { n: stat!.count })}
            {showWinRate && wr !== null && <span className="v-wr-inline"> · {formatPercent(wr, 0)}</span>}
          </span>
          <span className={`v-dot mx-auto h-1.5 w-1.5 rounded-full ${tint.tone === 'profit' ? 'bg-profit' : tint.tone === 'loss' ? 'bg-loss' : 'bg-muted'}`} />
        </div>
      )}
    </button>
  );
});
