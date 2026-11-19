import { ENDPOINTS, HISTORICAL, LIMITS, PT, ERR } from './constants';

export interface Envelope {
  clientMsgId?: string;
  payloadType: number;
  payload?: Record<string, unknown>;
}

export class CTraderError extends Error {
  constructor(
    public code: string,
    public description?: string,
    public retryAfterSec?: number,
  ) {
    super(description ? `${code}: ${description}` : code);
  }
}

export interface Transport {
  send<T = Record<string, unknown>>(payloadType: number, payload: Record<string, unknown>): Promise<T>;
}

type State = 'idle' | 'connecting' | 'open' | 'closed';

interface Pending {
  resolve: (v: Record<string, unknown>) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** Simple rate limiter: at most `perSecond` starts in any rolling second. */
class Throttle {
  private stamps: number[] = [];
  constructor(private perSecond: number) {}
  async wait() {
    for (;;) {
      const now = Date.now();
      this.stamps = this.stamps.filter((t) => now - t < 1000);
      if (this.stamps.length < this.perSecond) {
        this.stamps.push(now);
        return;
      }
      await sleep(1000 - (now - this.stamps[0]!) + 5);
    }
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * JSON-over-WebSocket client for the cTrader Open API.
 * - Matches responses to requests by clientMsgId.
 * - Heartbeat every LIMITS.heartbeatMs.
 * - Reconnects with exponential backoff and calls `onReconnect` so the owner can re-authenticate.
 * - Throttles historical requests and retries BLOCKED_PAYLOAD_TYPE after `retryAfter`.
 */
export class CTraderClient implements Transport {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private seq = 0;
  private hb: ReturnType<typeof setInterval> | null = null;
  private retries = 0;
  private wantOpen = false;
  private openPromise: Promise<void> | null = null;
  private general = new Throttle(20);
  private historical = new Throttle(LIMITS.historicalPerSecond);
  state: State = 'idle';

  constructor(
    public env: keyof typeof ENDPOINTS,
    private handlers: { onEvent?: (e: Envelope) => void; onReconnect?: () => Promise<void> | void; onState?: (s: State, retryInMs?: number) => void } = {},
  ) {}

  connect(): Promise<void> {
    this.wantOpen = true;
    if (this.state === 'open') return Promise.resolve();
    if (this.openPromise) return this.openPromise;
    this.openPromise = new Promise<void>((resolve, reject) => {
      this.setState('connecting');
      let ws: WebSocket;
      try {
        ws = new WebSocket(ENDPOINTS[this.env]);
      } catch (e) {
        this.openPromise = null;
        reject(new CTraderError('NETWORK', String(e)));
        return;
      }
      this.ws = ws;
      ws.onopen = () => {
        this.retries = 0;
        this.setState('open');
        this.openPromise = null;
        this.startHeartbeat();
        resolve();
      };
      ws.onmessage = (ev) => this.onMessage(ev.data);
      ws.onerror = () => {
        /* handled in onclose */
      };
      ws.onclose = () => {
        const wasOpen = this.state === 'open';
        this.stopHeartbeat();
        this.ws = null;
        this.openPromise = null;
        this.setState('closed');
        for (const [, p] of this.pending) {
          clearTimeout(p.timer);
          p.reject(new CTraderError('NETWORK', 'connection closed'));
        }
        this.pending.clear();
        if (!wasOpen) reject(new CTraderError('NETWORK'));
        if (this.wantOpen) this.scheduleReconnect();
      };
    });
    return this.openPromise;
  }

  close() {
    this.wantOpen = false;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect() {
    const delay = Math.min(30_000, 1000 * 2 ** this.retries) + Math.random() * 400;
    this.retries++;
    this.handlers.onState?.('closed', delay);
    setTimeout(async () => {
      if (!this.wantOpen || this.state === 'open') return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return this.scheduleReconnect();
      try {
        await this.connect();
        await this.handlers.onReconnect?.();
      } catch {
        /* onclose schedules the next attempt */
      }
    }, delay);
  }

  private setState(s: State) {
    this.state = s;
    this.handlers.onState?.(s);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.hb = setInterval(() => this.raw({ payloadType: PT.HEARTBEAT_EVENT, payload: {} }), LIMITS.heartbeatMs);
  }
  private stopHeartbeat() {
    if (this.hb) clearInterval(this.hb);
    this.hb = null;
  }

  private raw(msg: Envelope) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private onMessage(data: unknown) {
    let msg: Envelope;
    try {
      msg = JSON.parse(String(data)) as Envelope;
    } catch {
      return;
    }
    if (msg.payloadType === PT.HEARTBEAT_EVENT) return;
    const p = msg.clientMsgId ? this.pending.get(msg.clientMsgId) : undefined;
    if (p) {
      this.pending.delete(msg.clientMsgId!);
      clearTimeout(p.timer);
      if (msg.payloadType === PT.OA_ERROR_RES || msg.payloadType === PT.ERROR_RES) {
        const pl = msg.payload ?? {};
        p.reject(new CTraderError(String(pl.errorCode ?? 'UNKNOWN'), pl.description as string | undefined, pl.retryAfter !== undefined ? Number(pl.retryAfter) : undefined));
      } else p.resolve(msg.payload ?? {});
      return;
    }
    this.handlers.onEvent?.(msg);
  }

  async send<T = Record<string, unknown>>(payloadType: number, payload: Record<string, unknown>, attempt = 0): Promise<T> {
    await (HISTORICAL.has(payloadType) ? this.historical : this.general).wait();
    if (this.state !== 'open') await this.connect();
    const clientMsgId = `dv${++this.seq}`;
    try {
      return (await new Promise<Record<string, unknown>>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(clientMsgId);
          reject(new CTraderError('TIMEOUT'));
        }, LIMITS.requestTimeoutMs);
        this.pending.set(clientMsgId, { resolve, reject, timer });
        this.raw({ clientMsgId, payloadType, payload });
      })) as T;
    } catch (e) {
      if (e instanceof CTraderError && e.code === ERR.BLOCKED_PAYLOAD_TYPE && attempt < 4) {
        await sleep(((e.retryAfterSec ?? 1) + 0.5) * 1000);
        return this.send<T>(payloadType, payload, attempt + 1);
      }
      if (e instanceof CTraderError && e.code === 'TIMEOUT' && attempt < 1) return this.send<T>(payloadType, payload, attempt + 1);
      throw e;
    }
  }
}
