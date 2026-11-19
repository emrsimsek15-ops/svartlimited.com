import { m } from 'framer-motion';
import { useId } from 'react';

export function Segmented<T extends string>({ value, options, onChange, size = 'md', label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; size?: 'sm' | 'md'; label?: string }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="relative inline-flex min-w-0 max-w-full overflow-x-auto rounded-ctl border border-line/[0.07] bg-surface p-0.5 [scrollbar-width:none]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative shrink-0 whitespace-nowrap rounded-[8px] px-3 font-medium transition-colors duration-150 ${size === 'sm' ? 'h-8 text-[12.5px]' : 'h-9 text-[13px]'} ${active ? 'text-text' : 'text-muted hover:text-text'}`}
          >
            {active && <m.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[8px] bg-surface3" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
