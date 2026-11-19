import { useLiveQuery } from 'dexie-react-hooks';
import { Bug, Copy, Download, Link2, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { tr as trLocale } from 'date-fns/locale';
import { db } from '../../db/db';
import { exportBackup, getCredentials, getTokens, importBackup, loadSampleData, removeAccountData, removeSampleData, saveCredentials, saveSettings, saveTokens, wipeAll, wipeCredentials, type Credentials } from '../../db/repo';
import { useAccounts, useSettings } from '../../hooks/useData';
import { strings, errorText } from '../../i18n';
import { PageHeader } from '../../components/Card';
import { Segmented } from '../../components/Segmented';
import { useUI } from '../../store/ui';
import { redirectUri, startOAuth } from '../../ctrader/oauth';
import { disconnect, loadAccountList, requestSync } from '../../ctrader/controller';
import { deviceTimezone } from '../../lib/time';
import { fromUnits } from '../../lib/money';
import { formatMoney } from '../../lib/format';

const S = strings.settings;

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[860px]">
      <PageHeader title={S.title} />
      <div className="flex flex-col gap-4">
        <ConnectionSection />
        <AccountsSection />
        <PreferencesSection />
        <DataSection />
        <p className="px-1 text-center text-[12px] text-faint">Da Vinci · {S.version} {__APP_VERSION__}</p>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

function ConnectionSection() {
  const toast = useUI((s) => s.showToast);
  const [cred, setCred] = useState<Credentials>({ clientId: '', clientSecret: '', environment: 'demo' });
  const [manual, setManual] = useState({ accessToken: '', refreshToken: '' });
  const [showManual, setShowManual] = useState(false);
  const tokens = useLiveQuery(getTokens, []);
  useEffect(() => {
    void getCredentials().then((c) => c && setCred(c));
  }, []);
  const uri = useMemo(() => redirectUri(), []);
  const save = async () => {
    await saveCredentials({ ...cred, clientId: cred.clientId.trim(), clientSecret: cred.clientSecret.trim() });
  };
  return (
    <Section title={S.connection} hint={S.connectionHint}>
      <div className="flex items-center gap-2 text-[13px]">
        <span className={`h-2 w-2 rounded-full ${tokens?.accessToken ? 'bg-profit' : 'bg-faint'}`} />
        <span>{tokens?.accessToken ? S.connected : S.notConnected}</span>
        {tokens?.expiresAt && <span className="text-muted">· {S.tokenExpires}: {formatDistanceToNowStrict(tokens.expiresAt, { locale: trLocale, addSuffix: true })}</span>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={S.clientId}>
          <input className="input" autoComplete="off" spellCheck={false} value={cred.clientId} onChange={(e) => setCred({ ...cred, clientId: e.target.value })} onBlur={save} />
        </Field>
        <Field label={S.clientSecret}>
          <input className="input" type="password" autoComplete="off" value={cred.clientSecret} onChange={(e) => setCred({ ...cred, clientSecret: e.target.value })} onBlur={save} />
        </Field>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="label">{S.environment}</span>
        <div>
          <Segmented label={S.environment} value={cred.environment} onChange={(environment) => { const next = { ...cred, environment }; setCred(next); void saveCredentials(next); }} options={[{ value: 'demo', label: S.demo }, { value: 'live', label: S.live }]} />
        </div>
      </div>
      <Field label={S.redirectUri}>
        <div className="flex min-w-0 gap-2">
          <input className="input num text-muted" readOnly value={uri} onFocus={(e) => e.target.select()} />
          <button className="btn-ghost shrink-0" onClick={() => navigator.clipboard?.writeText(uri).then(() => toast(S.copied))} aria-label={S.copy}>
            <Copy size={16} />
          </button>
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={!cred.clientId || !cred.clientSecret} onClick={async () => { await save(); try { await startOAuth(); } catch (e) { toast(errorText((e as Error).message), 'err'); } }}>
          <Link2 size={16} /> {S.connect}
        </button>
        <button className="btn-ghost" onClick={() => setShowManual((v) => !v)} aria-expanded={showManual}>{S.manualTokens}</button>
      </div>
      {showManual && (
        <div className="flex flex-col gap-3 rounded-ctl border border-line/[0.07] bg-surface2/50 p-3">
          <p className="text-[12.5px] text-muted">{S.manualHint}</p>
          <Field label={S.accessToken}><input className="input" autoComplete="off" spellCheck={false} value={manual.accessToken} onChange={(e) => setManual({ ...manual, accessToken: e.target.value })} /></Field>
          <Field label={S.refreshToken}><input className="input" autoComplete="off" spellCheck={false} value={manual.refreshToken} onChange={(e) => setManual({ ...manual, refreshToken: e.target.value })} /></Field>
          <div>
            <button className="btn-primary" disabled={!manual.accessToken.trim()} onClick={async () => { await save(); await saveTokens({ accessToken: manual.accessToken.trim(), refreshToken: manual.refreshToken.trim(), expiresAt: null }); setManual({ accessToken: '', refreshToken: '' }); setShowManual(false); toast(strings.common.saved); }}>
              {S.saveTokens}
            </button>
          </div>
        </div>
      )}
      {(tokens?.accessToken || cred.clientId) && (
        <div>
          <button className="btn-danger" onClick={async () => { if (!confirm(S.disconnectConfirm)) return; disconnect(); await wipeCredentials(); setCred({ clientId: '', clientSecret: '', environment: 'demo' }); }}>
            <Trash2 size={16} /> {S.disconnect}
          </button>
        </div>
      )}
    </Section>
  );
}

function AccountsSection() {
  const accounts = useAccounts()?.filter((a) => a.environment !== 'sample');
  const sync = useUI((s) => s.sync);
  const toast = useUI((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const busy = !['idle', 'done', 'error'].includes(sync.phase);
  return (
    <Section title={S.accounts}>
      {!accounts?.length ? <p className="text-[13.5px] text-muted">{S.noAccounts}</p> : (
        <ul className="flex flex-col divide-y divide-line/[0.06] overflow-hidden rounded-ctl border border-line/[0.07]">
          {accounts.map((a) => (
            <li key={a.id} className="flex min-w-0 flex-wrap items-center gap-3 bg-surface2/40 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[14px] font-medium">{a.broker} · {a.traderLogin ?? a.id}</span>
                  <span className={`rounded-[6px] px-1.5 text-[11px] font-semibold leading-5 ${a.environment === 'live' ? 'bg-loss/15 text-loss' : 'bg-accent/15 text-accent'}`}>{a.environment === 'live' ? S.live : S.demo}</span>
                </div>
                <div className="num mt-0.5 truncate text-[12px] text-muted">
                  {a.currency}
                  {a.balanceU !== undefined && ` · ${formatMoney(fromUnits(a.balanceU, a.moneyDigits), a.currency)}`} · {S.lastSynced}: {a.lastSyncedAt ? formatDistanceToNowStrict(a.lastSyncedAt, { locale: trLocale, addSuffix: true }) : S.never}
                </div>
              </div>
              <label className="flex min-h-[44px] items-center gap-2 text-[13px]">
                <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={a.enabled} onChange={(e) => db.accounts.update(a.id, { enabled: e.target.checked })} />
                {S.accountEnabled}
              </label>
              <button className="icon-btn" aria-label={S.removeAccount} onClick={() => confirm(S.removeAccount + '?') && removeAccountData(a.id)}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {busy && sync.progress !== null && (
        <div>
          <div className="mb-1 flex justify-between text-[12px] text-muted">
            <span>{strings.sync[sync.phase as keyof typeof strings.sync]}</span>
            <span className="num">{Math.round(sync.progress * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface3">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${sync.progress * 100}%` }} />
          </div>
        </div>
      )}
      {sync.phase === 'error' && <p role="alert" className="rounded-ctl border border-loss/25 bg-loss/10 px-3 py-2 text-[13px] text-loss">{strings.sync.error}: {errorText(sync.error ?? undefined)}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" disabled={loading} onClick={async () => { setLoading(true); try { const n = await loadAccountList(); toast(`${n} ${S.accounts.toLowerCase()}`); } catch (e) { toast(errorText((e as { code?: string }).code ?? (e as Error).message), 'err'); } finally { setLoading(false); } }}>
          {loading && <RefreshCw size={15} className="animate-spin" />} {S.loadAccounts}
        </button>
        <button className="btn-primary" disabled={busy || !accounts?.some((a) => a.enabled)} onClick={() => requestSync()}>
          <RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> {busy ? S.syncing : S.syncNow}
        </button>
        <button className="btn-ghost" disabled={busy || !accounts?.some((a) => a.enabled)} onClick={() => requestSync({ full: true })}>{S.fullResync}</button>
      </div>
    </Section>
  );
}

function PreferencesSection() {
  const settings = useSettings();
  const zones = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone');
    } catch {
      return ['UTC', 'Europe/Istanbul', 'Europe/London', 'America/New_York'];
    }
  }, []);
  const list = zones.includes(settings.timezone) ? zones : [settings.timezone, ...zones];
  return (
    <Section title={S.preferences}>
      <Field label={S.timezone} hint={S.timezoneHint}>
        <select className="input" value={settings.timezone} onChange={(e) => saveSettings({ timezone: e.target.value })}>
          {list.map((z) => <option key={z} value={z}>{z}{z === deviceTimezone() ? ' (cihaz)' : ''}</option>)}
        </select>
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="label">{S.weekStart}</span>
        <div>
          <Segmented label={S.weekStart} value={String(settings.weekStartsOn)} onChange={(v) => saveSettings({ weekStartsOn: Number(v) as 0 | 1 | 6 })} options={[{ value: '1', label: S.monday }, { value: '0', label: S.sunday }, { value: '6', label: S.saturday }]} />
        </div>
      </div>
      <Toggle label={S.showWinRate} checked={settings.showWinRateInCalendar} onChange={(v) => saveSettings({ showWinRateInCalendar: v })} />
      <Toggle label={S.demoData} hint={S.demoHint} checked={settings.demoData} onChange={(v) => (v ? loadSampleData() : removeSampleData())} />
    </Section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[14px]">{label}</span>
        {hint && <span className="block text-[12.5px] text-muted">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-surface3 transition-colors duration-200 peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function DataSection() {
  const toast = useUI((s) => s.showToast);
  const file = useRef<HTMLInputElement>(null);
  return (
    <Section title={S.data} hint={S.exportHint}>
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={async () => {
          const b = await exportBackup();
          const url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `davinci-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>
          <Download size={16} /> {S.export}
        </button>
        <button className="btn-ghost" onClick={() => file.current?.click()}>
          <Upload size={16} /> {S.import}
        </button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try { await importBackup(JSON.parse(await f.text())); toast(S.importDone); } catch { toast(S.importFailed, 'err'); }
        }} />
        <Link to="/debug" className="btn-ghost"><Bug size={16} /> {S.debug}</Link>
      </div>
      <div>
        <button className="btn-danger" onClick={async () => { if (!confirm(S.wipeConfirm)) return; disconnect(); await wipeAll(); localStorage.removeItem('davinci.ui'); window.location.reload(); }}>
          <Trash2 size={16} /> {S.wipe}
        </button>
      </div>
    </Section>
  );
}
