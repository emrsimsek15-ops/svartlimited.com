export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-ctl ${className}`} aria-hidden="true" />;
}
