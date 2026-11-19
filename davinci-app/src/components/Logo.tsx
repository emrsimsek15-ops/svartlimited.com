/** Original Da Vinci mark: a square inscribed with a circle that touches its corners' midlines —
 * a minimal nod to Vitruvian proportions — plus a rising stroke. */
export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect x="10" y="10" width="44" height="44" rx="3" stroke="rgb(var(--accent))" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="24" stroke="rgb(var(--text))" strokeOpacity="0.85" strokeWidth="2.5" />
      <path d="M18 42 L28 32 L35 37 L46 23" stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LogoMark size={28} />
      {!collapsed && (
        <span className="truncate text-[17px] font-semibold tracking-[-0.01em]">
          Da <span className="text-accent">Vinci</span>
        </span>
      )}
    </div>
  );
}
