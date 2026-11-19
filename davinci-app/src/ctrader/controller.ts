import { CTraderClient, CTraderError, type Envelope } from './client';
import { EXECUTION_TYPE, PT, ERR, enumValue } from './constants';
import { syncAccount, authAccount, type SyncStore } from './sync';
import { normalizeCashFlow, normalizeDeal, num } from './normalize';
import { db } from '../db/db';
import { getCredentials, getTokens, rebuildPositions, saveSymbols, saveTokens, upsertCashFlows, type Tokens } from '../db/repo';
import { useUI } from '../store/ui';

/**
 * Owns the WebSocket connections (one per environment) and runs syncs. UI talks to it through
 * `requestSync`, `loadAccountList`, `disconnect`. Status is published to the zustand store.
 */

type Env = 'demo' | 'live';
const clients = new Map<Env, CTraderClient>();
let running: Promise<void> | null = null;
let queued = false;

const setSync = (s: Parameters<ReturnType<typeof useUI.getState>['setSync']>[0]) => useUI.getState().setSync(s);

const store: SyncStore = {
  async saveDeals(_a, deals) {
    await db.deals.bulkPut(deals);
  },
  saveCashFlows: upsertCashFlows,
  saveSymbols,
  async saveAccount(id, patch) {
    await db.accounts.update(id, patch);
  },
  rebuild: rebuildPositions,
};

async function appAuth(c: CTraderClient) {
  const cred = await getCredentials();
  if (!cred?.clientId || !cred.clientSecret) throw new CTraderError('NO_CREDENTIALS');
  await c.send(PT.APPLICATION_AUTH_REQ, { clientId: cred.clientId, clientSecret: cred.clientSecret });
}

async function client(env: Env): Promise<CTraderClient> {
  let c = clients.get(env);
  if (!c) {
    c = new CTraderClient(env, {
      onEvent: (e) => void onEvent(e),
      onReconnect: async () => {
        setSync({ phase: 'reconnecting' });
        await appAuth(c!);
        const t = await getTokens();
        for (const a of await db.accounts.toArray()) if (a.enabled && a.environment === env && t) await authAccount(c!, a.id, t.accessToken).catch(() => undefined);
        setSync({ phase: 'done', live: true });
        void requestSync();
      },
      onState: (s) => {
        if (s === 'closed') setSync({ live: false });
      },
    });
    clients.set(env, c);
  }
  if (c.state !== 'open') {
    await c.connect();
    await appAuth(c);
  }
  return c;
}

async function tokens(): Promise<Tokens> {
  const t = await getTokens();
  if (!t?.accessToken) throw new CTraderError('NO_CREDENTIALS');
  return t;
}

/** Refresh via ProtoOARefreshTokenReq over the socket (no CORS involved). */
export async function refreshTokens(): Promise<Tokens> {
  const t = await tokens();
  if (!t.refreshToken) throw new CTraderError(ERR.CH_ACCESS_TOKEN_INVALID);
  const cred = await getCredentials();
  const c = await client(cred?.environment ?? 'demo');
  const res = await c.send<Record<string, unknown>>(PT.REFRESH_TOKEN_REQ, { refreshToken: t.refreshToken });
  const next: Tokens = { accessToken: String(res.accessToken), refreshToken: String(res.refreshToken ?? t.refreshToken), expiresAt: res.expiresIn ? Date.now() + num(res.expiresIn) * 1000 : null };
  await saveTokens(next);
  return next;
}

async function freshTokens(): Promise<Tokens> {
  const t = await tokens();
  if (t.expiresAt && t.expiresAt - Date.now() < 3 * 86_400_000 && t.refreshToken) {
    try {
      return await refreshTokens();
    } catch {
      return t;
    }
  }
  return t;
}

export async function loadAccountList(): Promise<number> {
  const cred = await getCredentials();
  const t = await freshTokens();
  const c = await client(cred?.environment ?? 'demo');
  const res = await c.send<Record<string, unknown>>(PT.GET_ACCOUNTS_BY_ACCESS_TOKEN_REQ, { accessToken: t.accessToken });
  const list = (res.ctidTraderAccount as Record<string, unknown>[]) ?? [];
  for (const a of list) {
    const id = num(a.ctidTraderAccountId);
    const existing = await db.accounts.get(id);
    if (existing) {
      await db.accounts.update(id, { environment: a.isLive ? 'live' : 'demo', traderLogin: a.traderLogin !== undefined ? num(a.traderLogin) : existing.traderLogin, broker: (a.brokerTitleShort as string) ?? existing.broker });
    } else {
      await db.accounts.put({ id, environment: a.isLive ? 'live' : 'demo', traderLogin: a.traderLogin !== undefined ? num(a.traderLogin) : undefined, broker: (a.brokerTitleShort as string) ?? 'cTrader', currency: 'USD', moneyDigits: 2, enabled: false });
    }
  }
  return list.length;
}

/** Sync every enabled cTrader account. Coalesces concurrent calls. */
export function requestSync(opts: { full?: boolean } = {}): Promise<void> {
  if (running) {
    queued = true;
    return running;
  }
  running = (async () => {
    try {
      const accounts = (await db.accounts.toArray()).filter((a) => a.enabled && a.environment !== 'sample');
      if (!accounts.length) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSync({ phase: 'error', error: 'NETWORK', live: false });
        return;
      }
      setSync({ phase: 'connecting', error: null, progress: null });
      let t = await freshTokens();
      for (const a of accounts) {
        const env = a.environment as Env;
        setSync({ phase: 'authApp', accountId: a.id });
        const c = await client(env);
        const first = opts.full || !a.firstSyncDone;
        const run = () =>
          syncAccount(c, store, a.id, {
            accessToken: t.accessToken,
            since: first ? undefined : a.syncCursor,
            previousOpen: a.openPositionIds,
            onPhase: (phase) => setSync({ phase }),
            onProgress: first ? (p) => setSync({ progress: p }) : undefined,
          });
        try {
          await run();
        } catch (e) {
          if (e instanceof CTraderError && (e.code === ERR.CH_ACCESS_TOKEN_INVALID || e.code === ERR.OA_AUTH_TOKEN_EXPIRED)) {
            t = await refreshTokens();
            await run();
          } else throw e;
        }
      }
      setSync({ phase: 'done', progress: null, live: true });
    } catch (e) {
      setSync({ phase: 'error', progress: null, error: e instanceof CTraderError ? e.code : (e as Error).message });
    } finally {
      running = null;
      if (queued) {
        queued = false;
        void requestSync();
      }
    }
  })();
  return running;
}

/** Live updates while the app is open. */
async function onEvent(e: Envelope) {
  const p = e.payload ?? {};
  const accountId = num(p.ctidTraderAccountId);
  if (e.payloadType === PT.EXECUTION_EVENT) {
    const type = enumValue(EXECUTION_TYPE, p.executionType);
    const account = await db.accounts.get(accountId);
    if (!account) return;
    const pos = p.position as Record<string, unknown> | undefined;
    if (pos) {
      const id = num(pos.positionId);
      const status = String(pos.positionStatus);
      const open = new Set(account.openPositionIds ?? []);
      if (status === 'POSITION_STATUS_OPEN' || status === '1') open.add(id);
      else open.delete(id);
      await db.accounts.update(accountId, { openPositionIds: [...open] });
    }
    if (p.deal) {
      const d = normalizeDeal(accountId, p.deal as Record<string, unknown>);
      await db.deals.put(d);
      await rebuildPositions(accountId, [d.positionId]);
      await db.accounts.update(accountId, { syncCursor: Math.max(account.syncCursor ?? 0, d.executionTimestamp), lastSyncedAt: Date.now() });
    } else if (pos) {
      await rebuildPositions(accountId, [num(pos.positionId)]);
    }
    if (type === EXECUTION_TYPE.DEPOSIT_WITHDRAW && p.depositWithdraw) {
      await upsertCashFlows([normalizeCashFlow(accountId, p.depositWithdraw as Record<string, unknown>, account.moneyDigits)]);
    }
  } else if (e.payloadType === PT.TRADER_UPDATE_EVENT) {
    const tr = (p.trader ?? {}) as Record<string, unknown>;
    if (tr.balance !== undefined) await db.accounts.update(accountId, { balanceU: num(tr.balance) });
  } else if (e.payloadType === PT.ACCOUNTS_TOKEN_INVALIDATED_EVENT || e.payloadType === PT.ACCOUNT_DISCONNECT_EVENT) {
    try {
      await refreshTokens();
      void requestSync();
    } catch {
      setSync({ phase: 'error', error: ERR.CH_ACCESS_TOKEN_INVALID, live: false });
    }
  } else if (e.payloadType === PT.CLIENT_DISCONNECT_EVENT) {
    setSync({ phase: 'error', error: String(p.reason ?? 'NETWORK'), live: false });
  }
}

export function disconnect() {
  for (const c of clients.values()) c.close();
  clients.clear();
  setSync({ phase: 'idle', live: false, progress: null, error: null });
}

/** Sync on open and whenever the app regains focus. */
export function installAutoSync() {
  void requestSync();
  let last = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - last > 30_000) {
      last = Date.now();
      void requestSync();
    }
  });
  window.addEventListener('online', () => void requestSync());
}
