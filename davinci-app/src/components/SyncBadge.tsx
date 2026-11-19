import { RefreshCw } from 'lucide-react';
import { useUI } from '../store/ui';
import { strings, errorText } from '../i18n';
import { requestSync } from '../ctrader/controller';
import { useAccounts } from '../hooks/useData';
import { formatDistanceToNowStrict } from 'date-fns';
import { tr } from 'date-fns/locale';

export function SyncBadge({ compact = false }: { compact?: boolean }) {
  const sync = useUI((s) => s.sync);
  const accounts = useAccounts();
  const real = accounts?.filter((a) => a.environment !== 'sample') ?? [];
  if (!real.length) return null;
  const last = Math.max(0, ...real.map((a) => a.lastSyncedAt ?? 0));
  const busy = !['idle', 'done', 'error'].includes(sync.phase);
  const label = busy
    ? sync.progress !== null
      ? `${strings.sync[sync.phase as keyof typeof strings.sync] ?? ''} ${Math.round(sync.progress * 100)}%`
      : (strings.sync[sync.phase as keyof typeof strings.sync] ?? '')
    : sync.phase === 'error'
      ? errorText(sync.error ?? undefined)
      : last
        ? formatDistanceToNowStrict(last, { locale: tr, addSuffix: true })
        : strings.settings.never;
  const dot = sync.phase === 'error' ? 'bg-loss' : sync.live ? 'bg-profit' : 'bg-faint';
  return (
    <button onClick={() => requestSync()} disabled={busy} title={label} aria-label={`${strings.settings.syncNow} — ${label}`} className={`flex min-h-[36px] min-w-0 items-center gap-2 rounded-ctl text-[12px] text-muted transition-colors hover:text-text ${compact ? 'justify-center px-2' : 'w-full px-2.5'}`}>
      {busy ? <RefreshCw size={14} className="shrink-0 animate-spin text-accent" /> : <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />}
      {!compact && <span className="min-w-0 truncate">{label}</span>}
    </button>
  );
}
