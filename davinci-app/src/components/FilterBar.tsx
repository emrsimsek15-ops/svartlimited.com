import { useState } from 'react';
import { strings } from '../i18n';
import { useUI } from '../store/ui';
import { useAccounts } from '../hooks/useData';
import type { PeriodId } from '../lib/time';
import { Sheet } from './Sheet';

const PERIODS: PeriodId[] = ['week', 'month', 'last30', 'ytd', 'all', 'custom'];

export function PeriodSelect() {
  const period = useUI((s) => s.period);
  const custom = useUI((s) => s.custom);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(custom.from ?? '');
  const [to, setTo] = useState(custom.to ?? '');
  return (
    <>
      <label className="sr-only" htmlFor="period">{strings.trades.date}</label>
      <select
        id="period"
        className="input h-10 w-auto min-w-[140px] pr-8"
        value={period}
        onChange={(e) => {
          const p = e.target.value as PeriodId;
          if (p === 'custom') setOpen(true);
          else useUI.getState().setPeriod(p);
        }}
      >
        {PERIODS.map((p) => (
          <option key={p} value={p}>
            {p === 'custom' && period === 'custom' && custom.from ? `${custom.from} → ${custom.to ?? ''}` : strings.periods[p]}
          </option>
        ))}
      </select>
      <Sheet open={open} onClose={() => setOpen(false)} title={strings.periods.custom}>
        <form
          className="flex flex-col gap-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            useUI.getState().setPeriod('custom', { from: from || null, to: to || null });
            setOpen(false);
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="label">{strings.common.from}</span>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label">{strings.common.to}</span>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn-primary" type="submit">{strings.common.apply}</button>
        </form>
      </Sheet>
    </>
  );
}

export function AccountSelect() {
  const accounts = useAccounts()?.filter((a) => a.enabled);
  const value = useUI((s) => s.accountFilter);
  if (!accounts || accounts.length < 2) return null;
  return (
    <>
      <label className="sr-only" htmlFor="account">{strings.accounts.label}</label>
      <select id="account" className="input h-10 w-auto min-w-[140px] max-w-[220px]" value={String(value)} onChange={(e) => useUI.getState().setAccountFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
        <option value="all">{strings.accounts.all}</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.broker} · {a.traderLogin ?? a.id}
          </option>
        ))}
      </select>
    </>
  );
}
