import { useId, useMemo } from 'react';
import { markSvg } from '../brand/mark.js';

/** Da Vinci mark: Vitruvian circle and square with Fibonacci-sized rising candles. */
export function LogoMark({ size = 30, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  const inner = useMemo(() => markSvg(`m${id}`, { lines: 0.16 }), [id]);
  return <svg width={size} height={size} viewBox="8 8 48 48" className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: inner }} />;
}

export function Wordmark({ collapsed = false, subtitle = false }: { collapsed?: boolean; subtitle?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LogoMark size={collapsed ? 34 : 32} />
      {!collapsed && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-[17px] font-semibold tracking-[-0.015em] text-text">Da Vinci</span>
          {subtitle && <span className="mt-1 truncate text-[9.5px] font-semibold tracking-[0.28em] text-muted">TRADE JOURNAL</span>}
        </span>
      )}
    </div>
  );
}
