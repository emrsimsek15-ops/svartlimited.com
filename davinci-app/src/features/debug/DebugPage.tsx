import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { db } from '../../db/db';
import { useSettings, useTrades } from '../../hooks/useData';
import { balanceChain, buildTrade, groupByPosition } from '../../lib/pnl';
import { fromUnits } from '../../lib/money';
import { formatNumber } from '../../lib/format';
import { strings, fmt } from '../../i18n';
import { PageHeader } from '../../components/Card';
import { useUI } from '../../store/ui';

const D = strings.debug;
const LIMIT = 150;

export default function DebugPage() {
  const trades = useTrades();
  const settings = useSettings();
  const filter = useUI((s) => s.accountFilter);
  const [q, setQ] = useState('');
  const deals = useLiveQuery(() => (filter === 'all' ? db.deals.toArray() : db.deals.where('accountId').equals(filter).toArray()), [filter]);
  const data = useMemo(() => {
    if (!deals || !trades) return null;
    const groups = groupByPosition(deals);
    const chain = new Map(balanceChain(deals.filter((d) => d.closePositionDetail)).map((c) => [c.dealId, c]));
    const rows = trades
      .filter((t) => !q || `${t.positionId} ${t.symbol}`.toLowerCase().includes(q.toLowerCase()))
      .slice(0, LIMIT)
      .map((t) => {
        const ds = groups.get(t.key) ?? [];
        const b = buildTrade(t.key, ds, { symbols: new Map([[t.symbolId, t.symbol]]) });
        return { t, ds, dealCommissionU: b.dealCommissionU };
      });
    const checked = [...chain.values()];
    return { rows, okCount: checked.filter((c) => c.ok).length, badCount: checked.filter((c) => !c.ok).length, chain };
  }, [deals, trades, q]);

  return (
    <div>
      <PageHeader title={D.title} />
      <p className="mb-3 text-[13.5px] text-muted">{D.hint}</p>
      {data && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px]">
          <span>{D.balanceCheck}:</span>
          <span className="text-profit">{data.okCount} {D.ok}</span>
          <span className={data.badCount ? 'text-loss' : 'text-muted'}>{data.badCount} {D.mismatch}</span>
          <input className="input ml-auto h-10 w-full sm:w-64" placeholder={strings.common.search} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      <p className="mb-2 text-[12px] text-faint">{fmt(D.limit, { n: LIMIT })}</p>
      <div className="flex flex-col gap-3">
        {data?.rows.map(({ t, ds, dealCommissionU }) => {
          const f = (u: number) => formatNumber(fromUnits(u, t.moneyDigits), t.moneyDigits);
          const cpdMismatch = t.status === 'closed' && dealCommissionU !== t.commissionU;
          return (
            <details key={t.key} className="card min-w-0 overflow-hidden">
              <summary className="flex min-h-[48px] cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13px]">
                <span className="num font-semibold">#{t.positionId}</span>
                <span>{t.symbol}</span>
                <span className="text-muted">{t.status}</span>
                <span className="num">gross {f(t.grossU)} · swap {f(t.swapU)} · comm {f(t.commissionU)}{t.feeU ? ` · fee ${f(t.feeU)}` : ''}</span>
                <span className={`num ml-auto font-semibold ${t.netU >= 0 ? 'text-profit' : 'text-loss'}`}>net {f(t.netU)}</span>
                {cpdMismatch && <span className="text-[12px] text-warn">{D.dealCommission} {f(dealCommissionU)} ≠ {D.cpdCommission}</span>}
              </summary>
              <div className="overflow-x-auto border-t border-line/[0.06]">
                <table className="num w-full min-w-[760px] text-left text-[12px]">
                  <thead className="text-muted">
                    <tr>{['dealId', 'time', 'side', 'filledVol', 'price', 'deal.commission', 'cpd.gross', 'cpd.swap', 'cpd.comm', 'cpd.fee', 'cpd.balance', D.balanceCheck].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {ds.map((d) => {
                      const c = d.closePositionDetail;
                      const ch = data.chain.get(d.dealId);
                      return (
                        <tr key={d.key} className="border-t border-line/[0.04]">
                          <td className="px-3 py-1.5">{d.dealId}</td>
                          <td className="px-3 py-1.5">{formatInTimeZone(d.executionTimestamp, settings.timezone, 'yyyy-MM-dd HH:mm:ss')}</td>
                          <td className="px-3 py-1.5">{d.tradeSide === 1 ? 'BUY' : 'SELL'}</td>
                          <td className="px-3 py-1.5">{d.filledVolume}</td>
                          <td className="px-3 py-1.5">{d.executionPrice ?? '—'}</td>
                          <td className="px-3 py-1.5">{d.commission ?? '—'}</td>
                          <td className="px-3 py-1.5">{c?.grossProfit ?? '—'}</td>
                          <td className="px-3 py-1.5">{c?.swap ?? '—'}</td>
                          <td className="px-3 py-1.5">{c?.commission ?? '—'}</td>
                          <td className="px-3 py-1.5">{c?.pnlConversionFee ?? '—'}</td>
                          <td className="px-3 py-1.5">{c?.balance ?? '—'}</td>
                          <td className={`px-3 py-1.5 ${ch ? (ch.ok ? 'text-profit' : 'text-loss') : 'text-faint'}`}>{ch ? (ch.ok ? D.ok : `${D.mismatch} (${ch.expectedU})`) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
