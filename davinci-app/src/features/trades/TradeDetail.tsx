import { useLiveQuery } from 'dexie-react-hooks';
import { formatDate } from '../../lib/format';
import { db } from '../../db/db';
import { Sheet } from '../../components/Sheet';
import { useUI } from '../../store/ui';
import { useAccounts, useSettings } from '../../hooks/useData';
import { Money } from '../../components/Money';
import { SideBadge } from './TradeRow';
import { TradeJournal } from '../journal';
import { strings, fmt } from '../../i18n';
import { formatDuration, formatPrice, formatVolume } from '../../lib/format';

export function TradeDetail() {
  const key = useUI((s) => s.tradeKey);
  const settings = useSettings();
  const accounts = useAccounts();
  const t = useLiveQuery(() => (key ? db.trades.get(key) : undefined), [key]);
  const close = () => useUI.getState().openTrade(null);
  const currency = accounts?.find((a) => a.id === t?.accountId)?.currency ?? 'USD';
  const tz = settings.timezone;
  const when = (ts: number | null) => (ts === null ? '—' : formatDate(ts, tz, 'd MMM yyyy, HH:mm:ss'));
  return (
    <Sheet
      open={!!key}
      onClose={close}
      wide
      title={
        t ? (
          <span className="flex items-center gap-2">
            {t.symbol} <SideBadge side={t.side} />
          </span>
        ) : (
          strings.detail.title
        )
      }
    >
      {t && (
        <div className="flex flex-col gap-5 pt-1">
          <div className="rounded-card border border-line/[0.07] bg-surface p-4">
            <div className="label">{strings.detail.net}</div>
            <Money units={t.netU} digits={t.moneyDigits} currency={currency} className="mt-0.5 block text-[30px] font-semibold tracking-[-0.02em]" />
            {t.status === 'open' && <p className="mt-1 text-[12.5px] text-accent">{strings.detail.openPosition} {strings.detail.unrealizedNote}</p>}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line/[0.06] pt-3 text-[13.5px] sm:grid-cols-4">
              <Row label={strings.detail.gross}><Money units={t.grossU} digits={t.moneyDigits} currency={currency} colored={false} /></Row>
              <Row label={strings.detail.swap}><Money units={t.swapU} digits={t.moneyDigits} currency={currency} colored={false} /></Row>
              <Row label={strings.detail.commission}><Money units={t.commissionU} digits={t.moneyDigits} currency={currency} colored={false} /></Row>
              {t.feeU !== 0 && <Row label={strings.detail.fee}><Money units={t.feeU} digits={t.moneyDigits} currency={currency} colored={false} /></Row>}
            </dl>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
            <Row label={strings.detail.entry}><span className="num">{formatPrice(t.entryPrice)}</span></Row>
            <Row label={strings.detail.exit}><span className="num">{formatPrice(t.exitPrice)}</span></Row>
            <Row label={strings.detail.opened}><span className="num">{when(t.openTime)}</span></Row>
            <Row label={strings.detail.closedAt}><span className="num">{when(t.closeTime)}</span></Row>
            <Row label={strings.detail.duration}><span className="num">{formatDuration(t.durationMs)}</span></Row>
            <Row label={strings.detail.volume}><span className="num">{formatVolume(t.volume)}</span>{t.partialCloses > 0 && <span className="ml-1 text-muted">· {fmt(strings.detail.partials, { n: t.partialCloses })}</span>}</Row>
            <Row label={strings.detail.position}><span className="num text-muted">#{t.positionId}</span></Row>
          </dl>
          <div className="border-t border-line/[0.06] pt-4">
            <h3 className="mb-3 text-[15px] font-semibold">{strings.detail.journal}</h3>
            <TradeJournal tradeKey={t.key} />
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label">{label}</dt>
      <dd className="mt-0.5 min-w-0 truncate">{children}</dd>
    </div>
  );
}
