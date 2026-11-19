import type { Account, CashFlow, RawDeal, RawClosePositionDetail } from './types';

/** Deterministic sample dataset (~300 trades over 6 months) built as RAW DEALS, so the demo
 * exercises exactly the same deal → trade pipeline as real cTrader data. */

export const SAMPLE_ACCOUNT_ID = 9_000_001;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Sym {
  id: number;
  name: string;
  price: number;
  pip: number;
  lotUnits: number;
  commissionPerLotSide: number; // in account currency
  swapPerLotNight: number;
  weight: number;
}

export const SAMPLE_SYMBOLS: Sym[] = [
  { id: 1, name: 'EURUSD', price: 1.085, pip: 0.0001, lotUnits: 100_000, commissionPerLotSide: 3.5, swapPerLotNight: -0.9, weight: 5 },
  { id: 2, name: 'GBPUSD', price: 1.27, pip: 0.0001, lotUnits: 100_000, commissionPerLotSide: 3.5, swapPerLotNight: -0.7, weight: 3 },
  { id: 4, name: 'USDJPY', price: 151.2, pip: 0.01, lotUnits: 100_000, commissionPerLotSide: 3.5, swapPerLotNight: 1.1, weight: 2 },
  { id: 41, name: 'XAUUSD', price: 2650, pip: 0.1, lotUnits: 100, commissionPerLotSide: 3.5, swapPerLotNight: -4.2, weight: 4 },
  { id: 10015, name: 'US30', price: 43_200, pip: 1, lotUnits: 1, commissionPerLotSide: 0, swapPerLotNight: -1.6, weight: 2 },
  { id: 10017, name: 'NAS100', price: 20_800, pip: 1, lotUnits: 1, commissionPerLotSide: 0, swapPerLotNight: -1.2, weight: 3 },
];

export interface SampleData {
  account: Account;
  deals: RawDeal[];
  cashFlows: CashFlow[];
  symbols: Map<number, string>;
  openPositions: Set<string>;
  journal: { tradePositionId: number; tags: string[]; setup: string; rating: number; mistakes: string[]; note: string }[];
}

const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Range', 'News'];
const TAGS = ['A+', 'trend', 'london', 'newyork', 'scalp', 'swing', 'fomo', 'plan'];
const MISTAKES = ['Erken çıkış', 'Geç giriş', 'Stop kaydırma', 'Aşırı lot', 'Plansız işlem'];

export function generateSampleData(now = Date.now(), seed = 42): SampleData {
  const rnd = mulberry32(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]!;
  const totalWeight = SAMPLE_SYMBOLS.reduce((s, x) => s + x.weight, 0);
  const pickSym = () => {
    let r = rnd() * totalWeight;
    for (const s of SAMPLE_SYMBOLS) if ((r -= s.weight) < 0) return s;
    return SAMPLE_SYMBOLS[0]!;
  };

  const DAY = 86_400_000;
  const start = Math.floor((now - 182 * DAY) / DAY) * DAY;
  const digits = 2;
  const deals: RawDeal[] = [];
  const journal: SampleData['journal'] = [];
  let dealId = 500_000_000;
  let orderId = 700_000_000;
  let positionId = 300_000_000;
  const prices = new Map(SAMPLE_SYMBOLS.map((s) => [s.id, s.price]));

  const mk = (p: Partial<RawDeal> & Pick<RawDeal, 'positionId' | 'symbolId' | 'executionTimestamp' | 'tradeSide' | 'filledVolume'>): RawDeal => {
    const id = ++dealId;
    return {
      key: `${SAMPLE_ACCOUNT_ID}:${id}`,
      accountId: SAMPLE_ACCOUNT_ID,
      dealId: id,
      orderId: ++orderId,
      volume: p.filledVolume,
      createTimestamp: p.executionTimestamp - 40,
      dealStatus: 2,
      moneyDigits: digits,
      ...p,
    } as RawDeal;
  };

  const openPositions = new Set<string>();
  for (let day = start; day < now; day += DAY) {
    const wd = new Date(day).getUTCDay();
    const weekend = wd === 0 || wd === 6;
    if (weekend && rnd() > 0.06) continue;
    if (!weekend && rnd() < 0.12) continue; // some days off
    const n = weekend ? 1 : 1 + Math.floor(rnd() * 4.2);
    for (let i = 0; i < n; i++) {
      const s = pickSym();
      // Mostly London/NY session; a few around midnight UTC to exercise timezone bucketing.
      const hour = rnd() < 0.08 ? 23 + rnd() * 1.9 : 6 + rnd() * 14;
      const openTs = Math.round(day + hour * 3600_000 + rnd() * 60_000);
      if (openTs >= now - 60_000) continue;
      const swing = rnd() < 0.12;
      const durMs = swing ? (1 + Math.floor(rnd() * 3)) * DAY + rnd() * 6 * 3600_000 : 120_000 + rnd() * rnd() * 6 * 3600_000;
      const closeTs = Math.round(openTs + durMs);
      const lots = s.lotUnits === 1 ? 1 + Math.floor(rnd() * 5) : Math.round((0.1 + rnd() * 1.4) * 10) / 10;
      const units = lots * s.lotUnits;
      const cents = Math.round(units * 100);
      const buy = rnd() < 0.55;
      const side: 1 | 2 = buy ? 1 : 2;
      const pos = ++positionId;

      // Outcome in account currency, then derive prices.
      const risk = 40 + rnd() * 160;
      const r = rnd();
      let gross: number;
      if (r < 0.035) gross = 0;
      else if (r < 0.57) gross = risk * (0.4 + rnd() * 2.2);
      else gross = -risk * (0.3 + rnd() * 0.8);
      const grossU = Math.round(gross * 100);

      const entry = prices.get(s.id)! * (1 + (rnd() - 0.5) * 0.004);
      prices.set(s.id, entry);
      const priceMove = units > 0 ? gross / units : 0; // quote-currency approximation
      const exit = entry + (buy ? priceMove : -priceMove);
      const round = (x: number) => Math.round(x / (s.pip / 10)) * (s.pip / 10);

      const commSideU = -Math.round(s.commissionPerLotSide * lots * 100);
      const nights = Math.floor((closeTs - day) / DAY);
      const swapU = Math.round(s.swapPerLotNight * lots * nights * 100);

      const stillOpen = closeTs > now;
      deals.push(mk({ positionId: pos, symbolId: s.id, executionTimestamp: openTs, tradeSide: side, filledVolume: cents, executionPrice: round(entry), commission: commSideU }));
      if (stillOpen) {
        openPositions.add(`${SAMPLE_ACCOUNT_ID}:${pos}`);
        continue;
      }
      const partial = !swing && rnd() < 0.15 && cents >= 20;
      const parts = partial ? [0.5, 0.5] : [1];
      let cumCents = 0;
      let grossLeft = grossU;
      let swapLeft = swapU;
      parts.forEach((frac, idx) => {
        const last = idx === parts.length - 1;
        const partCents = last ? cents - cumCents : Math.round(cents * frac);
        cumCents += partCents;
        const pGross = last ? grossLeft : Math.round(grossU * (partCents / cents));
        const pSwap = last ? swapLeft : Math.round(swapU * (partCents / cents));
        grossLeft -= pGross;
        swapLeft -= pSwap;
        // Realized commission for the closed volume = entry share + exit side.
        const exitComm = Math.round(commSideU * (partCents / cents));
        const entryShare = last ? commSideU - Math.round(commSideU * ((cents - partCents) / cents)) : Math.round(commSideU * (partCents / cents));
        const ts = last ? closeTs : Math.round(openTs + (closeTs - openTs) * 0.45);
        const cpd: RawClosePositionDetail = {
          entryPrice: round(entry),
          grossProfit: pGross,
          swap: pSwap,
          commission: entryShare + exitComm,
          balance: 0, // filled below
          closedVolume: partCents,
          moneyDigits: digits,
        };
        deals.push(mk({ positionId: pos, symbolId: s.id, executionTimestamp: ts, tradeSide: buy ? 2 : 1, filledVolume: partCents, executionPrice: round(last ? exit : entry + (exit - entry) * 0.6), commission: exitComm, closePositionDetail: cpd }));
      });

      if (rnd() < 0.55) {
        const win = grossU > 0;
        journal.push({
          tradePositionId: pos,
          setup: pick(SETUPS),
          tags: Array.from(new Set([pick(TAGS), ...(rnd() < 0.4 ? [pick(TAGS)] : [])])),
          rating: win ? 3 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 3),
          mistakes: !win && rnd() < 0.5 ? [pick(MISTAKES)] : [],
          note: '',
        });
      }
    }
  }

  // Cash flows + consistent balance chain on closing deals.
  const cashFlows: CashFlow[] = [];
  const cf = (time: number, delta: number, type: number, note: string) =>
    cashFlows.push({ key: `${SAMPLE_ACCOUNT_ID}:${time}`, accountId: SAMPLE_ACCOUNT_ID, id: time, type, deltaU: delta * 100, balanceU: 0, moneyDigits: digits, time, note });
  cf(start + 3 * 3600_000, 10_000, 0, 'İlk yatırım');
  cf(start + 75 * DAY + 10 * 3600_000, 2_500, 0, 'Ek yatırım');
  cf(start + 150 * DAY + 9 * 3600_000, -1_500, 1, 'Çekim');

  type Ev = { t: number; kind: 'deal'; d: RawDeal } | { t: number; kind: 'cash'; c: CashFlow };
  const evs: Ev[] = [
    ...deals.filter((d) => d.closePositionDetail).map((d) => ({ t: d.executionTimestamp, kind: 'deal' as const, d })),
    ...cashFlows.map((c) => ({ t: c.time, kind: 'cash' as const, c })),
  ].sort((a, b) => a.t - b.t);
  let bal = 0;
  let version = 0;
  for (const e of evs) {
    version++;
    if (e.kind === 'cash') {
      bal += e.c.deltaU;
      e.c.balanceU = bal;
    } else {
      const c = e.d.closePositionDetail!;
      bal += c.grossProfit + c.swap + c.commission;
      c.balance = bal;
      c.balanceVersion = version;
    }
  }

  const account: Account = {
    id: SAMPLE_ACCOUNT_ID,
    traderLogin: 5_120_431,
    broker: 'Örnek Veri',
    environment: 'sample',
    currency: 'USD',
    moneyDigits: digits,
    balanceU: bal,
    lastSyncedAt: now,
    syncCursor: now,
    firstSyncDone: true,
    enabled: true,
  };

  return { account, deals, cashFlows, symbols: new Map(SAMPLE_SYMBOLS.map((s) => [s.id, s.name])), openPositions, journal };
}
