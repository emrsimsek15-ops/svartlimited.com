import { animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../hooks/useMedia';

/** Counts from the previous value to `value` without re-rendering React on every frame. */
export function CountUp({ value, format, className = '' }: { value: number; format: (v: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const c = animate(prev.current, value, {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = format(v)),
      onComplete: () => (el.textContent = format(value)),
    });
    prev.current = value;
    return () => c.stop();
  }, [value, format, reduced]);
  return (
    <span ref={ref} className={`num ${className}`}>
      {format(value)}
    </span>
  );
}
