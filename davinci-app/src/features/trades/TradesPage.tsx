import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { formatDate } from '../../lib/format';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, SlidersHorizontal } from 'lucide-react';
import { useDeferredValue, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDerived, useJournalMap } from '../../hooks/useData';
import { useIsPhone } from '../../hooks/useMedia';
import { tradeDay } from '../../lib/aggregate';
import { rescale } from '../../lib/money';
import { formatDuration, formatVolume } from '../../lib/format';
import type { Trade } from '../../lib/types';
import { strings, fmt } from '../../i18n';
import { Card, Empty, PageHeader } from '../../components/Card';
import { Money } from '../../components/Money';
import { AccountSelect } from '../../components/FilterBar';
import { Skeleton } from '../../components/Skeleton';
import { SideBadge, TradeCardRow } from './TradeRow';
import { useUI } from '../../store/ui';

type SortKey = 'date' | 'net' | 'duration' | 'volume';
interface Filters {
  q: string;
  symbol: string;
  side: '' | 'buy' | 'sell';
  outcome: '' | 'win' | 'loss' | 'be';
  tag: string;
  from: string;
  to: string;
  includeOpen: boolean;
}
const EMPTY: Filters = { q: '', symbol: '', side: '', outcome: '', tag: '', from: '', to: '', includeOpen: true };

const COLS = 'grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_88px_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)]';

export default function TradesPage() {
  const d = useDerived();
  const journal = useJournalMap();
  const phone = useIsPhone();
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'date', desc: true });
  const [showFilters, setShowFilters] = useState(false);
  const q = useDeferredValue(f.q.trim().toLowerCase());

  const symbols = useMemo(() => (d ? [...new Set(d.trades.map((t) => t.symbol))].sort() : []), [d]);
  const tags = useMemo(() => [...new Set([...journal.values()].filter((j) => j.kind === 'trade').flatMap((j) => j.tags))].sort(), [journal]);

  const rows = useMemo(() => {
    if (!d) return [];
    const out = d.trades.filter((t) => {
      if (!f.includeOpen && t.status === 'open') return false;
      if (f.symbol && t.symbol !== f.symbol) return false;
      if (f.side && t.side !== f.side) return false;
      if (f.outcome) {
        if (t.status === 'open') return false;
        const o = t.netU > 0 ? 'win' : t.netU < 0 ? 'loss' : 'be';
        if (o !== f.outcome) return false;
      }
      const j = journal.get(`trade:${t.key}`);
      if (f.tag && !j?.tags.includes(f.tag)) return false;
      if (f.from || f.to) {
        const k = tradeDay(t, d.tz);
        if (f.from && k < f.from) return false;
        if (f.to && k > f.to) return false;
      }
      if (q) {
        const hay = `${t.symbol} ${t.positionId} ${j?.tags.join(' ') ?? ''} ${j?.setup ?? ''} ${j?.note ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const val = (t: Trade) =>
      sort.key === 'date' ? (t.closeTime ?? t.openTime) : sort.key === 'net' ? rescale(t.netU, t.moneyDigits, d.digits) : sort.key === 'duration' ? (t.durationMs ?? 0) : t.volume;
    out.sort((a, b) => (sort.desc ? val(b) - val(a) : val(a) - val(b)) || b.positionId - a.positionId);
    return out;
  }, [d, f, q, sort, journal]);

  const listRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => setOffset(listRef.current?.offsetTop ?? 0), [showFilters, phone, d]);
  const rowH = phone ? 64 : 52;
  const v = useWindowVirtualizer({ count: rows.length, estimateSize: () => rowH, overscan: 12, scrollMargin: offset });

  const active = Object.entries(f).filter(([k, val]) => k !== 'includeOpen' && k !== 'q' && val).length + (f.includeOpen ? 0 : 1);
  const set = (p: Partial<Filters>) => setF((c) => ({ ...c, ...p }));

  return (
    <div>
      <PageHeader title={strings.trades.title}>
        <AccountSelect />
      </PageHeader>

      <div className="mb-3 flex min-w-0 gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{strings.common.search}</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input h-11 pl-9" type="search" placeholder={strings.trades.searchPlaceholder} value={f.q} onChange={(e) => set({ q: e.target.value })} />
        </label>
        <button className={`btn-ghost h-11 shrink-0 ${active ? 'border-accent/40 text-accent' : ''}`} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-label={strings.trades.filters}>
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">{strings.trades.filters}</span>
          {active > 0 && <span className="num rounded-full bg-accentStrong px-1.5 text-[11px] leading-5 text-white">{active}</span>}
        </button>
        <label className="sr-only" htmlFor="sort">{strings.trades.sortBy}</label>
        <select id="sort" className="input h-11 w-auto shrink-0" value={sort.key} onChange={(e) => setSort((s) => ({ ...s, key: e.target.value as SortKey }))}>
          <option value="date">{strings.trades.sortDate}</option>
          <option value="net">{strings.trades.sortNet}</option>
          <option value="duration">{strings.trades.sortDuration}</option>
          <option value="volume">{strings.trades.sortVolume}</option>
        </select>
        <button className="icon-btn h-11 w-11 border border-line/[0.08] bg-surface2" onClick={() => setSort((s) => ({ ...s, desc: !s.desc }))} aria-label={strings.trades.sortBy}>
          {sort.desc ? <ArrowDownWideNarrow size={18} /> : <ArrowUpNarrowWide size={18} />}
        </button>
      </div>

      {showFilters && (
        <div className="card mb-3 grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-6">
          <Sel label={strings.trades.symbol} value={f.symbol} onChange={(symbol) => set({ symbol })} options={[['', strings.trades.allSymbols], ...symbols.map((s) => [s, s] as [string, string])]} />
          <Sel label={strings.trades.side} value={f.side} onChange={(side) => set({ side: side as Filters['side'] })} options={[['', strings.trades.allSides], ['buy', strings.common.long], ['sell', strings.common.short]]} />
          <Sel label={strings.common.win + ' / ' + strings.common.loss} value={f.outcome} onChange={(outcome) => set({ outcome: outcome as Filters['outcome'] })} options={[['', strings.trades.allOutcomes], ['win', strings.common.win], ['loss', strings.common.loss], ['be', strings.common.breakeven]]} />
          <Sel label={strings.trades.tags} value={f.tag} onChange={(tag) => set({ tag })} options={[['', strings.trades.allTags], ...tags.map((t) => [t, `#${t}`] as [string, string])]} />
          <label className="flex min-w-0 flex-col gap-1">
            <span className="label">{strings.common.from}</span>
            <input type="date" className="input" value={f.from} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="label">{strings.common.to}</span>
            <input type="date" className="input" value={f.to} onChange={(e) => set({ to: e.target.value })} />
          </label>
          <label className="col-span-2 flex min-h-[44px] items-center gap-2 text-[13.5px] sm:col-span-1">
            <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={f.includeOpen} onChange={(e) => set({ includeOpen: e.target.checked })} />
            {strings.trades.includeOpen}
          </label>
          <button className="btn-ghost col-span-2 sm:col-span-1" onClick={() => setF({ ...EMPTY, q: f.q })}>{strings.trades.clearFilters}</button>
        </div>
      )}

      <p className="num mb-2 text-[12.5px] text-muted" aria-live="polite">{fmt(strings.trades.count, { n: rows.length })}</p>

      {!d ? (
        <Skeleton className="h-[400px]" />
      ) : rows.length === 0 ? (
        <Card>
          <Empty title={strings.trades.noResults}>{active > 0 && <button className="btn-ghost" onClick={() => setF(EMPTY)}>{strings.trades.clearFilters}</button>}</Empty>
        </Card>
      ) : (
        <div className="card overflow-hidden">
          {!phone && (
            <div className={`grid ${COLS} items-center gap-3 border-b border-line/[0.06] px-4 py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-muted`}>
              <span>{strings.trades.date}</span>
              <span>{strings.trades.symbol}</span>
              <span>{strings.trades.side}</span>
              <span className="text-right">{strings.trades.volume}</span>
              <span className="text-right">{strings.trades.duration}</span>
              <span>{strings.trades.tags}</span>
              <span className="text-right">{strings.trades.net}</span>
            </div>
          )}
          <div ref={listRef} className="relative" style={{ height: v.getTotalSize() }}>
            {v.getVirtualItems().map((item) => {
              const t = rows[item.index]!;
              const j = journal.get(`trade:${t.key}`);
              return (
                <div key={t.key} className="absolute inset-x-0 border-b border-line/[0.04] px-1.5" style={{ height: item.size, transform: `translateY(${item.start - v.options.scrollMargin}px)` }}>
                  {phone ? (
                    <TradeCardRow t={t} tz={d.tz} digits={d.digits} currency={d.currency} tags={j?.tags} onOpen={(k) => useUI.getState().openTrade(k)} />
                  ) : (
                    <button onClick={() => useUI.getState().openTrade(t.key)} className={`grid h-full w-full ${COLS} items-center gap-3 rounded-ctl px-2.5 text-left text-[13.5px] transition-colors hover:bg-surface2`}>
                      <span className="num min-w-0 truncate text-muted">{formatDate(t.closeTime ?? t.openTime, d.tz, 'd MMM yy, HH:mm')}</span>
                      <span className="min-w-0 truncate font-semibold">
                        {t.symbol}
                        {t.status === 'open' && <span className="ml-1.5 text-[11px] font-medium text-accent">{strings.common.open}</span>}
                      </span>
                      <span><SideBadge side={t.side} /></span>
                      <span className="num min-w-0 truncate text-right">{formatVolume(t.volume)}</span>
                      <span className="num min-w-0 truncate text-right text-muted">{formatDuration(t.durationMs)}</span>
                      <span className="min-w-0 truncate text-[12.5px] text-accent/90">{j?.tags.length ? `#${j.tags.join(' #')}` : <span className="text-faint">—</span>}</span>
                      <Money units={rescale(t.netU, t.moneyDigits, d.digits)} digits={d.digits} currency={d.currency} className="min-w-0 truncate text-right font-semibold" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="label truncate">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
