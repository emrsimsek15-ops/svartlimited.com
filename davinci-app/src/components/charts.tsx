import { m } from 'framer-motion';
import { useMemo, useState, type PointerEvent } from 'react';
import { useElementWidth, useReducedMotion } from '../hooks/useMedia';
import type { SeriesPoint } from '../lib/aggregate';
import { formatCompact, formatMoney } from '../lib/format';
import { parseKey } from '../lib/time';
import { strings } from '../i18n';

/** Lightweight SVG charts (no chart library: keeps the bundle small and the look exact). */

const PAD = { l: 44, r: 8, t: 10, b: 22 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((x) => x * mag).find((s) => s >= step0) ?? step0;
  const out: number[] = [];
  const lo = Math.floor(min / step);
  const hi = Math.ceil(max / step);
  for (let i = lo; i <= hi; i++) out.push(i * step);
  return out;
}

const shortDate = (k: string) => {
  const { d, m: mm } = parseKey(k);
  return `${d} ${strings.months.short[mm - 1]}`;
};

function useHover(n: number, width: number) {
  const [i, setI] = useState<number | null>(null);
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left - PAD.l;
    const w = width - PAD.l - PAD.r;
    if (n === 0 || w <= 0) return;
    setI(Math.max(0, Math.min(n - 1, Math.round((x / w) * (n - 1)))));
  };
  return { i, onMove, onLeave: () => setI(null) };
}

function Tooltip({ x, width, children }: { x: number; width: number; children: React.ReactNode }) {
  const w = 148;
  const left = Math.max(0, Math.min(width - w, x - w / 2));
  return (
    <div className="glass pointer-events-none absolute top-0 z-10 rounded-[9px] border border-line/10 px-2.5 py-1.5 text-[12px] shadow-xl" style={{ left, width: w }}>
      {children}
    </div>
  );
}

export function EquityChart({ points, currency, height = 220 }: { points: SeriesPoint[]; currency: string; height?: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const reduced = useReducedMotion();
  const geo = useMemo(() => {
    if (width <= 0 || points.length === 0) return null;
    const vals = [0, ...points.map((p) => p.cumulative)];
    const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
    const lo = ticks[0]!;
    const hi = ticks[ticks.length - 1]!;
    const w = width - PAD.l - PAD.r;
    const h = height - PAD.t - PAD.b;
    const x = (i: number) => PAD.l + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
    const y = (v: number) => PAD.t + h - ((v - lo) / (hi - lo || 1)) * h;
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`).join('');
    const area = `${line}L${x(points.length - 1).toFixed(1)},${(PAD.t + h).toFixed(1)}L${x(0).toFixed(1)},${(PAD.t + h).toFixed(1)}Z`;
    return { ticks, x, y, line, area, h };
  }, [points, width, height]);
  const hover = useHover(points.length, width);
  const last = points[points.length - 1]?.cumulative ?? 0;
  const color = last >= 0 ? 'var(--profit)' : 'var(--loss)';
  const hp = hover.i !== null ? points[hover.i] : undefined;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {geo && (
        <svg width={width} height={height} className="block touch-pan-y" onPointerMove={hover.onMove} onPointerLeave={hover.onLeave} role="img" aria-label={`${strings.dashboard.equity}: ${formatMoney(last, currency, { sign: true })}`}>
          <defs>
            <linearGradient id="eq-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={`rgb(${color})`} stopOpacity="0.28" />
              <stop offset="100%" stopColor={`rgb(${color})`} stopOpacity="0" />
            </linearGradient>
          </defs>
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - PAD.r} y1={geo.y(t)} y2={geo.y(t)} stroke="rgb(255 255 255)" strokeOpacity={t === 0 ? 0.14 : 0.05} />
              <text x={PAD.l - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="num" fill="rgb(var(--muted))" fontSize="11">
                {formatCompact(t, { sign: false })}
              </text>
            </g>
          ))}
          {[0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
            <text key={i} x={geo.x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fill="rgb(var(--muted))" fontSize="11">
              {shortDate(points[i]!.key)}
            </text>
          ))}
          <m.path d={geo.area} fill="url(#eq-fill)" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.15 }} />
          <m.path d={geo.line} fill="none" stroke={`rgb(${color})`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" initial={reduced ? false : ({ pathLength: 0 } as never)} animate={{ pathLength: 1 } as never} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />
          {hp && hover.i !== null && (
            <g>
              <line x1={geo.x(hover.i)} x2={geo.x(hover.i)} y1={PAD.t} y2={PAD.t + geo.h} stroke="rgb(255 255 255)" strokeOpacity="0.18" />
              <circle cx={geo.x(hover.i)} cy={geo.y(hp.cumulative)} r="4" fill={`rgb(${color})`} stroke="rgb(var(--bg))" strokeWidth="2" />
            </g>
          )}
        </svg>
      )}
      {hp && hover.i !== null && geo && (
        <Tooltip x={geo.x(hover.i)} width={width}>
          <div className="text-muted">{shortDate(hp.key)}</div>
          <div className={`num font-semibold ${hp.cumulative >= 0 ? 'text-profit' : 'text-loss'}`}>{formatMoney(hp.cumulative, currency, { sign: true })}</div>
          <div className="num text-[11px] text-muted">
            {strings.dashboard.daily.split(' ')[0]}: {formatMoney(hp.value, currency, { sign: true })}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export function DailyBars({ points, currency, height = 200 }: { points: SeriesPoint[]; currency: string; height?: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const reduced = useReducedMotion();
  const geo = useMemo(() => {
    if (width <= 0 || points.length === 0) return null;
    const vals = [0, ...points.map((p) => p.value)];
    const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
    const lo = ticks[0]!;
    const hi = ticks[ticks.length - 1]!;
    const w = width - PAD.l - PAD.r;
    const h = height - PAD.t - PAD.b;
    const step = w / points.length;
    const bw = Math.max(1, Math.min(18, step * 0.7));
    const y = (v: number) => PAD.t + h - ((v - lo) / (hi - lo || 1)) * h;
    const x = (i: number) => PAD.l + step * i + step / 2;
    return { ticks, y, x, bw, h };
  }, [points, width, height]);
  const hover = useHover(points.length, width);
  const hp = hover.i !== null ? points[hover.i] : undefined;
  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {geo && (
        <svg width={width} height={height} className="block touch-pan-y" onPointerMove={hover.onMove} onPointerLeave={hover.onLeave} role="img" aria-label={strings.dashboard.daily}>
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - PAD.r} y1={geo.y(t)} y2={geo.y(t)} stroke="rgb(255 255 255)" strokeOpacity={t === 0 ? 0.14 : 0.05} />
              <text x={PAD.l - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" fill="rgb(var(--muted))" fontSize="11">
                {formatCompact(t, { sign: false })}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const y0 = geo.y(0);
            const y1 = geo.y(p.value);
            const top = Math.min(y0, y1);
            const hgt = Math.max(1, Math.abs(y1 - y0));
            return (
              <m.rect
                key={p.key}
                x={geo.x(i) - geo.bw / 2}
                width={geo.bw}
                y={top}
                height={hgt}
                rx={Math.min(3, geo.bw / 3)}
                fill={p.value >= 0 ? 'rgb(var(--profit))' : 'rgb(var(--loss))'}
                fillOpacity={hover.i === null || hover.i === i ? 0.9 : 0.45}
                style={{ transformOrigin: `0px ${y0}px` }}
                initial={reduced ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.3, delay: Math.min(0.2, i * 0.004), ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
          {[0, points.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
            <text key={i} x={geo.x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : 'end'} fill="rgb(var(--muted))" fontSize="11">
              {shortDate(points[i]!.key)}
            </text>
          ))}
        </svg>
      )}
      {hp && geo && hover.i !== null && (
        <Tooltip x={geo.x(hover.i)} width={width}>
          <div className="text-muted">{shortDate(hp.key)}</div>
          <div className={`num font-semibold ${hp.value >= 0 ? 'text-profit' : 'text-loss'}`}>{formatMoney(hp.value, currency, { sign: true })}</div>
        </Tooltip>
      )}
    </div>
  );
}

/** Horizontal diverging bars (HTML, fully responsive). */
export function HBars({ rows, currency }: { rows: { id: string; label: string; value: number; sub?: string }[]; currency: string }) {
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)));
  const hasNeg = rows.some((r) => r.value < 0);
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => {
        const pct = (Math.abs(r.value) / max) * (hasNeg ? 50 : 100);
        return (
          <li key={r.id} className="grid min-w-0 grid-cols-[minmax(0,88px)_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,120px)_minmax(0,1fr)_auto]">
            <span className="min-w-0 truncate text-[13px]" title={r.label}>
              {r.label}
              {r.sub && <span className="ml-1 text-[11.5px] text-muted">{r.sub}</span>}
            </span>
            <span className="relative h-5 min-w-0 rounded-[5px] bg-surface2/60">
              {hasNeg && <span className="absolute bottom-0 left-1/2 top-0 w-px bg-line/15" />}
              <m.span
                className={`absolute bottom-0 top-0 rounded-[5px] ${r.value >= 0 ? 'bg-profit/80' : 'bg-loss/80'}`}
                style={hasNeg ? (r.value >= 0 ? { left: '50%' } : { right: '50%' }) : { left: 0 }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className={`num w-[76px] text-right text-[13px] font-medium sm:w-[96px] ${r.value > 0 ? 'text-profit' : r.value < 0 ? 'text-loss' : 'text-muted'}`}>{formatCompactMoney(r.value, currency)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function formatCompactMoney(v: number, currency: string) {
  return Math.abs(v) >= 10_000 ? formatCompact(v) : formatMoney(v, currency, { sign: true, digits: Math.abs(v) >= 1000 ? 0 : 2 });
}
