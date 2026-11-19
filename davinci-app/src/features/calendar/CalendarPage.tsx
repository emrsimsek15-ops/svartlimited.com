import { AnimatePresence, m, type PanInfo } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDerived, useSettings } from '../../hooks/useData';
import { monthView } from '../../lib/aggregate';
import { addMonths, parseKey } from '../../lib/time';
import { strings } from '../../i18n';
import { useUI } from '../../store/ui';
import { MonthGrid, WeekStrip } from './MonthGrid';
import { MonthStats } from './MonthHeader';
import { YearView } from './YearView';
import { Segmented } from '../../components/Segmented';
import { Skeleton } from '../../components/Skeleton';
import { AccountSelect } from '../../components/FilterBar';
import { useReducedMotion } from '../../hooks/useMedia';

export default function CalendarPage() {
  const d = useDerived();
  const settings = useSettings();
  const reduced = useReducedMotion();
  const now = d ? parseKey(d.today) : parseKey(new Date().toISOString().slice(0, 10));
  const [ym, setYm] = useState({ y: now.y, m: now.m });
  const [dir, setDir] = useState(0);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [picker, setPicker] = useState(false);

  const view = useMemo(() => (d ? monthView(ym.y, ym.m, d.weekStartsOn, d.days) : null), [d, ym]);

  const go = (n: number) => {
    setDir(n);
    setYm((c) => (mode === 'year' ? { y: c.y + n, m: c.m } : addMonths(c.y, c.m, n)));
  };
  const goToday = () => {
    if (!d) return;
    const t = parseKey(d.today);
    setDir(t.y * 12 + t.m > ym.y * 12 + ym.m ? 1 : -1);
    setYm({ y: t.y, m: t.m });
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 60 || Math.abs(info.offset.x) < Math.abs(info.offset.y)) return;
    go(info.offset.x < 0 ? 1 : -1);
  };

  const title = mode === 'year' ? String(ym.y) : `${strings.months.long[ym.m - 1]} ${ym.y}`;

  return (
    <div className="min-w-0">
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:mb-5">
        <div className="flex min-w-0 items-center gap-1">
          <button className="icon-btn" onClick={() => go(-1)} aria-label={strings.calendar.prev}>
            <ChevronLeft size={20} />
          </button>
          <div className="relative min-w-0">
            <button className="flex h-10 min-w-0 items-center gap-1.5 rounded-ctl px-2 text-[20px] font-semibold tracking-[-0.015em] hover:bg-surface sm:text-[24px]" onClick={() => setPicker((p) => !p)} aria-expanded={picker} aria-label={strings.calendar.pickMonth}>
              <span className="truncate">{title}</span>
              <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${picker ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>{picker && <MonthPicker y={ym.y} m={ym.m} onPick={(y, mm) => { setDir(y * 12 + mm > ym.y * 12 + ym.m ? 1 : -1); setYm({ y, m: mm }); setPicker(false); }} onClose={() => setPicker(false)} />}</AnimatePresence>
          </div>
          <button className="icon-btn" onClick={() => go(1)} aria-label={strings.calendar.next}>
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <AccountSelect />
          <button className="btn-ghost h-9 min-h-0 px-3 text-[13px]" onClick={goToday}>
            {strings.calendar.today}
          </button>
          <Segmented size="sm" label={strings.calendar.title} value={mode} onChange={setMode} options={[{ value: 'month', label: strings.calendar.month }, { value: 'year', label: strings.calendar.year }]} />
        </div>
      </div>

      {!d || !view ? (
        <CalendarSkeleton />
      ) : mode === 'year' ? (
        <YearView y={ym.y} d={d} onPickMonth={(mm) => { setYm({ y: ym.y, m: mm }); setMode('month'); }} />
      ) : (
        <>
          <MonthStats s={view.summary} digits={d.digits} currency={d.currency} />
          <div className="card mt-3 overflow-hidden p-1 pb-2 sm:mt-4 sm:p-4">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <m.div
                key={`${ym.y}-${ym.m}`}
                custom={dir}
                variants={{
                  enter: (dd: number) => ({ x: reduced ? 0 : dd * 40, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dd: number) => ({ x: reduced ? 0 : dd * -40, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                dragDirectionLock
                onDragEnd={onDragEnd}
                className="touch-pan-y"
              >
                <MonthGrid view={view} days={d.days} digits={d.digits} currency={d.currency} today={d.today} weekStartsOn={d.weekStartsOn} showWinRate={settings.showWinRateInCalendar} onSelectDay={(k) => useUI.getState().openDay(k)} />
              </m.div>
            </AnimatePresence>
            <WeekStrip view={view} digits={d.digits} />
          </div>
          <Legend />
        </>
      )}
    </div>
  );
}

function Legend() {
  const steps = [0.25, 0.5, 1];
  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-[11.5px] text-muted" aria-hidden="true">
      <span className="flex items-center gap-1">
        {steps.map((s) => <span key={s} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `rgb(var(--loss) / ${0.14 + 0.46 * Math.sqrt(s)})` }} />)}
        <span className="ml-1">{strings.common.loss}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: 'rgb(138 146 166 / 0.14)' }} />
        <span className="ml-1">{strings.common.breakeven}</span>
      </span>
      <span className="flex items-center gap-1">
        {steps.map((s) => <span key={s} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `rgb(var(--profit) / ${0.14 + 0.46 * Math.sqrt(s)})` }} />)}
        <span className="ml-1">{strings.common.win}</span>
      </span>
    </div>
  );
}

function MonthPicker({ y, m: month, onPick, onClose }: { y: number; m: number; onPick: (y: number, m: number) => void; onClose: () => void }) {
  const [year, setYear] = useState(y);
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <m.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }} className="glass absolute left-0 top-12 z-50 w-[280px] max-w-[calc(100vw-32px)] rounded-card border border-line/10 p-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <button className="icon-btn" onClick={() => setYear(year - 1)} aria-label={String(year - 1)}>
            <ChevronLeft size={18} />
          </button>
          <span className="num text-[15px] font-semibold">{year}</span>
          <button className="icon-btn" onClick={() => setYear(year + 1)} aria-label={String(year + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {strings.months.short.map((name, i) => (
            <button key={name} onClick={() => onPick(year, i + 1)} className={`h-10 rounded-ctl text-[13px] font-medium transition-colors ${year === y && i + 1 === month ? 'bg-accentStrong text-white' : 'bg-surface2 text-text hover:bg-surface3'}`}>
              {name}
            </button>
          ))}
        </div>
      </m.div>
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div>
      <Skeleton className="h-[86px] w-full" />
      <div className="card mt-4 grid grid-cols-7 gap-1.5 p-3">
        {Array.from({ length: 42 }, (_, i) => (
          <Skeleton key={i} className="aspect-[5/6] sm:aspect-[4/3]" />
        ))}
      </div>
    </div>
  );
}
