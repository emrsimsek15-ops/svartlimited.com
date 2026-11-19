import type { ReactNode } from 'react';

export function Card({ title, action, children, className = '', bodyClass = 'p-4 sm:p-5' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={`card min-w-0 ${className}`}>
      {(title || action) && (
        <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-line/[0.06] px-4 py-2 sm:px-5">
          <h2 className="min-w-0 truncate text-[14px] font-semibold text-text">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3 sm:mb-6">
      <h1 className="text-[22px] font-semibold tracking-[-0.015em] sm:text-[26px]">{title}</h1>
      {children && <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Empty({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-[13.5px] text-muted">{hint}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
