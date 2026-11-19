import { memo } from 'react';
import { formatDate } from '../../lib/format';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { Trade } from '../../lib/types';
import { Money } from '../../components/Money';
import { formatDuration, formatVolume } from '../../lib/format';
import { strings } from '../../i18n';
import { rescale } from '../../lib/money';

export function SideBadge({ side }: { side: Trade['side'] }) {
  const buy = side === 'buy';
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-0.5 rounded-[6px] px-1.5 text-[11.5px] font-semibold ${buy ? 'bg-profit/12 text-profit' : 'bg-loss/12 text-loss'}`}>
      {buy ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {buy ? strings.common.long : strings.common.short}
    </span>
  );
}

/** Card-style row used on phones, in the dashboard recent list and in the day sheet. */
export const TradeCardRow = memo(function TradeCardRow({ t, tz, digits, currency, tags, onOpen, showDate = true }: { t: Trade; tz: string; digits: number; currency: string; tags?: string[]; onOpen: (k: string) => void; showDate?: boolean }) {
  const when = t.closeTime ?? t.openTime;
  return (
    <button onClick={() => onOpen(t.key)} className="flex min-h-[60px] w-full min-w-0 items-center gap-3 rounded-ctl px-3 py-2.5 text-left transition-colors hover:bg-surface2 active:bg-surface2">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14.5px] font-semibold">{t.symbol}</span>
          <SideBadge side={t.side} />
          {t.status === 'open' && <span className="rounded-[6px] bg-accent/15 px-1.5 text-[11px] font-medium leading-6 text-accent">{strings.common.open}</span>}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
          <span className="num shrink-0">{formatDate(when, tz, showDate ? 'd MMM HH:mm' : 'HH:mm')}</span>
          <span className="text-faint">·</span>
          <span className="num shrink-0">{formatVolume(t.volume)}</span>
          <span className="text-faint">·</span>
          <span className="num shrink-0">{formatDuration(t.durationMs)}</span>
          {tags && tags.length > 0 && <span className="min-w-0 truncate text-accent/90">#{tags.join(' #')}</span>}
        </div>
      </div>
      <Money units={rescale(t.netU, t.moneyDigits, digits)} digits={digits} currency={currency} className="shrink-0 text-[14.5px] font-semibold" />
    </button>
  );
});
