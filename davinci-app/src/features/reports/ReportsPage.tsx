import { useMemo } from 'react';
import { useDerived, useJournalMap, usePeriodTrades } from '../../hooks/useData';
import { bySide, bySymbol, byTag, byHour, byWeekday, computeStats } from '../../lib/aggregate';
import { fromUnits } from '../../lib/money';
import { formatMoney, formatNumber, formatPercent } from '../../lib/format';
import { strings } from '../../i18n';
import { Card, Empty, PageHeader } from '../../components/Card';
import { HBars } from '../../components/charts';
import { AccountSelect, PeriodSelect } from '../../components/FilterBar';
import { Skeleton } from '../../components/Skeleton';
import { toneClass } from '../../components/Money';
import type { Bucket } from '../../lib/aggregate';

export default function ReportsPage() {
  const d = useDerived();
  const trades = usePeriodTrades(d);
  const journal = useJournalMap();
  const data = useMemo(() => {
    if (!d) return null;
    const dg = d.digits;
    const sub = (b: Bucket) => `${b.count}`;
    const rows = (bs: Bucket[], label: (b: Bucket) => string = (b) => b.label) => bs.map((b) => ({ id: b.id, label: label(b), value: fromUnits(b.netU, dg), sub: sub(b) }));
    return {
      symbol: rows(bySymbol(trades, dg)),
      weekday: rows(byWeekday(trades, dg, d.tz), (b) => strings.weekdays.short[Number(b.id) % 7]!).filter((r, i) => i < 5 || r.sub !== '0'),
      hour: rows(byHour(trades, dg, d.tz), (b) => `${b.id.padStart(2, '0')}:00`).filter((r) => r.sub !== '0'),
      tag: rows(byTag(trades, dg, journal, 'tags'), (b) => `#${b.label}`),
      setup: rows(byTag(trades, dg, journal, 'setup')),
      sides: bySide(trades, dg).map((b) => ({ b, s: computeStats(trades.filter((t) => t.side === b.id), dg) })),
    };
  }, [d, trades, journal]);

  return (
    <div>
      <PageHeader title={strings.reports.title}>
        <AccountSelect />
        <PeriodSelect />
      </PageHeader>
      {!d || !data ? (
        <Skeleton className="h-[400px]" />
      ) : trades.length === 0 ? (
        <Card><Empty title={strings.trades.noResults} /></Card>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title={strings.reports.longShort} className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.sides.map(({ b, s }) => (
                <div key={b.id} className="rounded-ctl border border-line/[0.06] bg-surface2/50 p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`text-[14px] font-semibold ${b.id === 'buy' ? 'text-profit' : 'text-loss'}`}>{b.id === 'buy' ? strings.common.long : strings.common.short}</span>
                    <span className="num text-[12.5px] text-muted">{b.count} {strings.reports.trades}</span>
                  </div>
                  <div className={`num text-[20px] font-semibold ${toneClass(b.netU)}`}>{formatMoney(fromUnits(b.netU, d.digits), d.currency, { sign: true })}</div>
                  <div className="num mt-1 text-[12.5px] text-muted">
                    {strings.kpi.winRate}: {formatPercent(s.winRate)} · {strings.kpi.profitFactor}: {formatNumber(s.profitFactor, 2)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title={strings.reports.bySymbol}><HBars rows={data.symbol} currency={d.currency} /></Card>
          <Card title={strings.reports.byWeekday}><HBars rows={data.weekday} currency={d.currency} /></Card>
          <Card title={strings.reports.byHour}><HBars rows={data.hour} currency={d.currency} /></Card>
          <Card title={strings.reports.bySetup}>{data.setup.length ? <HBars rows={data.setup} currency={d.currency} /> : <p className="text-[13.5px] text-muted">{strings.reports.noTags}</p>}</Card>
          <Card title={strings.reports.byTag} className="lg:col-span-2">{data.tag.length ? <HBars rows={data.tag} currency={d.currency} /> : <p className="text-[13.5px] text-muted">{strings.reports.noTags}</p>}</Card>
        </div>
      )}
    </div>
  );
}
