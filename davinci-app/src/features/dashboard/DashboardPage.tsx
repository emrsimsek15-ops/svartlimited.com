import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { useDerived, useJournalMap, usePeriodRange, usePeriodTrades } from '../../hooks/useData';
import { computeStats, dailySeries, monthView } from '../../lib/aggregate';
import { fromUnits } from '../../lib/money';
import { formatMoney, formatNumber, formatPercent } from '../../lib/format';
import { parseKey } from '../../lib/time';
import { strings, fmt } from '../../i18n';
import { Card, Empty, PageHeader } from '../../components/Card';
import { CountUp } from '../../components/CountUp';
import { DailyBars, EquityChart } from '../../components/charts';
import { AccountSelect, PeriodSelect } from '../../components/FilterBar';
import { Skeleton } from '../../components/Skeleton';
import { MonthGrid } from '../calendar/MonthGrid';
import { TradeCardRow } from '../trades/TradeRow';
import { useUI } from '../../store/ui';
import { loadSampleData } from '../../db/repo';

export default function DashboardPage() {
  const d = useDerived();
  const range = usePeriodRange(d);
  const trades = usePeriodTrades(d);
  const journal = useJournalMap();
  const stats = useMemo(() => (d ? computeStats(trades, d.digits) : null), [trades, d]);
  const series = useMemo(() => (d ? dailySeries(d.days, d.digits, range) : []), [d, range]);
  const now = d ? parseKey(d.today) : null;
  const month = useMemo(() => (d && now ? monthView(now.y, now.m, d.weekStartsOn, d.days) : null), [d, now?.y, now?.m]); // eslint-disable-line react-hooks/exhaustive-deps
  const recent = useMemo(() => (d ? d.trades.filter((t) => t.status === 'closed').slice(0, 7) : []), [d]);

  const money = useCallback((v: number) => (d ? formatMoney(v, d.currency, { sign: true }) : ''), [d]);
  const plain = useCallback((v: number) => (d ? formatMoney(v, d.currency) : ''), [d]);
  const pct = useCallback((v: number) => formatPercent(v, 1), []);
  const num2 = useCallback((v: number) => formatNumber(v, 2), []);

  const header = (
    <PageHeader title={strings.dashboard.title}>
      <AccountSelect />
      <PeriodSelect />
    </PageHeader>
  );

  if (!d || !stats) {
    return (
      <div>
        {header}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)}
        </div>
        <Skeleton className="mt-4 h-[280px]" />
      </div>
    );
  }

  if (d.trades.length === 0) {
    return (
      <div>
        {header}
        <Card>
          <Empty title={strings.dashboard.empty} hint={strings.dashboard.emptyHint}>
            <button className="btn-primary" onClick={() => loadSampleData()}>{strings.dashboard.enableDemo}</button>
            <Link to="/settings" className="btn-ghost">{strings.dashboard.openSettings}</Link>
          </Empty>
        </Card>
      </div>
    );
  }

  const dg = d.digits;
  const kpis = [
    { label: strings.kpi.net, value: fromUnits(stats.netU, dg), format: money, tone: stats.netU, sub: fmt(strings.calendar.tradesN, { n: stats.count }) },
    { label: strings.kpi.winRate, value: stats.winRate ?? 0, format: pct, empty: stats.winRate === null, sub: fmt(strings.kpi.winsLosses, { w: stats.wins, l: stats.losses }) },
    { label: strings.kpi.profitFactor, value: stats.profitFactor ?? 0, format: num2, empty: stats.profitFactor === null, sub: `${plain(fromUnits(stats.grossWinU, dg))} / ${plain(fromUnits(-stats.grossLossU, dg))}` },
    { label: strings.kpi.avgWinLoss, value: stats.avgWinU !== null ? fromUnits(stats.avgWinU, dg) : 0, format: plain, empty: stats.avgWinU === null, sub: stats.avgLossU !== null ? `− ${plain(fromUnits(-stats.avgLossU, dg))}` : '—', ratio: stats.avgWinU !== null && stats.avgLossU ? stats.avgWinU / -stats.avgLossU : null },
    { label: strings.kpi.expectancy, value: stats.expectancyU !== null ? fromUnits(stats.expectancyU, dg) : 0, format: money, tone: stats.expectancyU ?? 0, empty: stats.expectancyU === null, sub: strings.kpi.perTrade },
    { label: strings.kpi.maxDrawdown, value: -fromUnits(stats.maxDrawdownU, dg), format: money, tone: stats.maxDrawdownU ? -1 : 0, sub: '' },
  ];

  return (
    <div>
      {header}
      {d.mixedCurrency && <p className="mb-3 rounded-ctl border border-warn/25 bg-warn/10 px-3 py-2 text-[13px] text-warn">{strings.accounts.mixedCurrency}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <m.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.03 }} className="card min-w-0 p-3.5 sm:p-4">
            <div className="label truncate">{k.label}</div>
            <div className="mt-1.5 min-w-0 truncate">
              {k.empty ? (
                <span className="num text-[20px] font-semibold text-faint sm:text-[22px]">—</span>
              ) : (
                <CountUp value={k.value} format={k.format} className={`text-[19px] font-semibold tracking-[-0.015em] sm:text-[22px] ${k.tone === undefined ? 'text-text' : k.tone > 0 ? 'text-profit' : k.tone < 0 ? 'text-loss' : 'text-text'}`} />
              )}
            </div>
            <div className="num mt-1 truncate text-[12px] text-muted">
              {k.sub}
              {'ratio' in k && k.ratio !== null && k.ratio !== undefined && <span className="ml-1 text-faint">· {formatNumber(k.ratio, 2)}R</span>}
            </div>
          </m.div>
        ))}
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title={strings.dashboard.equity} bodyClass="p-3 sm:p-4">
            {series.length ? <EquityChart points={series} currency={d.currency} /> : <Empty title={strings.trades.noResults} />}
          </Card>
          <Card title={strings.dashboard.daily} bodyClass="p-3 sm:p-4">
            {series.length ? <DailyBars points={series} currency={d.currency} height={180} /> : <Empty title={strings.trades.noResults} />}
          </Card>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1 xl:content-start">
          {month && (
            <Card title={`${strings.months.long[month.m - 1]} ${month.y}`} action={<Link to="/calendar" className="text-[12.5px] font-medium text-accent">{strings.calendar.title}</Link>} bodyClass="p-3 sm:p-4">
              <MonthGrid view={month} days={d.days} digits={dg} currency={d.currency} today={d.today} weekStartsOn={d.weekStartsOn} showWinRate={false} variant="compact" onSelectDay={(k) => useUI.getState().openDay(k)} />
              <div className="mt-3 flex items-baseline justify-between text-[12.5px]">
                <span className="text-muted">{strings.calendar.netMonth}</span>
                <span className={`num font-semibold ${month.summary.netU >= 0 ? 'text-profit' : 'text-loss'}`}>{money(fromUnits(month.summary.netU, dg))}</span>
              </div>
            </Card>
          )}
          <Card title={strings.dashboard.recent} action={<Link to="/trades" className="text-[12.5px] font-medium text-accent">{strings.dashboard.viewAll}</Link>} bodyClass="p-1.5">
            {recent.map((t) => (
              <TradeCardRow key={t.key} t={t} tz={d.tz} digits={dg} currency={d.currency} tags={journal.get(`trade:${t.key}`)?.tags} onOpen={(k) => useUI.getState().openTrade(k)} />
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
