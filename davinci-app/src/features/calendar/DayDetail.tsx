import { useMemo } from 'react';
import { Sheet } from '../../components/Sheet';
import { useDerived, useJournalMap } from '../../hooks/useData';
import { useUI } from '../../store/ui';
import { tradeDay } from '../../lib/aggregate';
import { parseKey, weekdayOfKey } from '../../lib/time';
import { strings, fmt } from '../../i18n';
import { Money } from '../../components/Money';
import { TradeCardRow } from '../trades/TradeRow';
import { NoteEditor } from '../journal';
import { formatPercent } from '../../lib/format';

export function DayDetail() {
  const key = useUI((s) => s.dayKey);
  const d = useDerived();
  const journal = useJournalMap();
  const close = () => useUI.getState().openDay(null);
  const trades = useMemo(() => (d && key ? d.trades.filter((t) => t.status === 'closed' && tradeDay(t, d.tz) === key).sort((a, b) => a.closeTime! - b.closeTime!) : []), [d, key]);
  const stat = key && d ? d.days.get(key) : undefined;
  let title = '';
  if (key) {
    const { d: dd, m, y } = parseKey(key);
    title = `${dd} ${strings.months.long[m - 1]} ${y}, ${strings.weekdays.long[weekdayOfKey(key)]}`;
  }
  const decided = stat ? stat.wins + stat.losses : 0;
  return (
    <Sheet open={!!key} onClose={close} title={title}>
      {d && key && (
        <div className="flex flex-col gap-5 pt-1">
          {stat && (
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-card border border-line/[0.07] bg-line/[0.06]">
              <div className="min-w-0 bg-surface px-3 py-2.5">
                <div className="label truncate">{strings.detail.net}</div>
                <Money units={stat.netU} digits={d.digits} currency={d.currency} className="block truncate text-[16px] font-semibold" />
              </div>
              <div className="min-w-0 bg-surface px-3 py-2.5">
                <div className="label truncate">{strings.common.tradesCap}</div>
                <div className="num text-[16px] font-semibold">{stat.count}</div>
              </div>
              <div className="min-w-0 bg-surface px-3 py-2.5">
                <div className="label truncate">{strings.calendar.winRate}</div>
                <div className="num text-[16px] font-semibold">{formatPercent(decided ? stat.wins / decided : null, 0)}</div>
              </div>
            </div>
          )}
          <div>
            {trades.length === 0 ? (
              <p className="py-4 text-center text-[14px] text-muted">{strings.calendar.noTrades}</p>
            ) : (
              <div className="-mx-3 flex flex-col">
                <p className="label mb-1 px-3">{fmt(strings.calendar.tradesN, { n: trades.length })}</p>
                {trades.map((t) => (
                  <TradeCardRow key={t.key} t={t} tz={d.tz} digits={d.digits} currency={d.currency} tags={journal.get(`trade:${t.key}`)?.tags} showDate={false} onOpen={(k) => useUI.getState().openTrade(k)} />
                ))}
              </div>
            )}
          </div>
          <NoteEditor kind="day" refKey={key} placeholder={strings.calendar.dayNotePlaceholder} />
        </div>
      )}
    </Sheet>
  );
}
