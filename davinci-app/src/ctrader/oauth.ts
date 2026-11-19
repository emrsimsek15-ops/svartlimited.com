import { OAUTH } from './constants';
import { db } from '../db/db';
import { getCredentials, saveTokens, type Tokens } from '../db/repo';

/** The redirect URI to register in the Open API portal: the app's own URL. */
export function redirectUri(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

export async function startOAuth() {
  const c = await getCredentials();
  if (!c?.clientId) throw new Error('NO_CREDENTIALS');
  const state = crypto.getRandomValues(new Uint32Array(4)).join('-');
  await db.kv.put({ key: 'ctrader.oauthState', value: state });
  const u = new URL(OAUTH.authorizeUrl);
  u.searchParams.set('client_id', c.clientId);
  u.searchParams.set('redirect_uri', redirectUri());
  u.searchParams.set('scope', OAUTH.scope);
  u.searchParams.set('state', state);
  window.location.assign(u.toString());
}

export function parseTokenResponse(j: Record<string, unknown>): Tokens {
  const access = (j.accessToken ?? j.access_token) as string | undefined;
  const refresh = (j.refreshToken ?? j.refresh_token) as string | undefined;
  const expires = Number(j.expiresIn ?? j.expires_in);
  if (!access) throw new Error(String(j.errorCode ?? j.error ?? j.description ?? 'TOKEN_EXCHANGE_FAILED'));
  return { accessToken: access, refreshToken: refresh ?? '', expiresAt: Number.isFinite(expires) ? Date.now() + expires * 1000 : null };
}

export type RedirectResult = 'none' | 'ok' | 'cors' | 'state' | { error: string };

/**
 * Handles `?code=…` after the cTrader consent screen. The token endpoint (GET, per Spotware's SDKs)
 * may not send CORS headers; in that case the user is asked to paste tokens from the Playground.
 */
export async function handleOAuthRedirect(): Promise<RedirectResult> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const err = params.get('error');
  if (!code && !err) return 'none';
  const clean = () => window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  if (err) {
    clean();
    return { error: err };
  }
  const expected = (await db.kv.get('ctrader.oauthState'))?.value;
  const state = params.get('state');
  if (state && expected && state !== expected) {
    clean();
    return 'state';
  }
  const c = await getCredentials();
  clean();
  if (!c) return { error: 'NO_CREDENTIALS' };
  const u = new URL(OAUTH.tokenUrl);
  u.searchParams.set('grant_type', 'authorization_code');
  u.searchParams.set('code', code!);
  u.searchParams.set('redirect_uri', redirectUri());
  u.searchParams.set('client_id', c.clientId);
  u.searchParams.set('client_secret', c.clientSecret);
  let res: Response;
  try {
    res = await fetch(u.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
  } catch {
    return 'cors';
  }
  try {
    await saveTokens(parseTokenResponse((await res.json()) as Record<string, unknown>));
    return 'ok';
  } catch (e) {
    return { error: String((e as Error).message) };
  }
}
