/** Raw deal as stored locally (normalized from ProtoOADeal; money fields stay integer-scaled). */
export interface RawClosePositionDetail {
  entryPrice: number;
  grossProfit: number;
  swap: number;
  commission: number;
  balance: number;
  closedVolume?: number;
  moneyDigits?: number;
  pnlConversionFee?: number;
  quoteToDepositConversionRate?: number;
  balanceVersion?: number;
}

export interface RawDeal {
  /** Compound key `${accountId}:${dealId}` so several accounts never collide. */
  key: string;
  accountId: number;
  dealId: number;
  orderId: number;
  positionId: number;
  volume: number; // cents
  filledVolume: number; // cents
  symbolId: number;
  createTimestamp: number;
  executionTimestamp: number;
  executionPrice?: number;
  tradeSide: 1 | 2;
  dealStatus: number;
  commission?: number; // integer, scaled by moneyDigits
  moneyDigits?: number;
  closePositionDetail?: RawClosePositionDetail;
  label?: string;
  comment?: string;
}

export type Side = 'buy' | 'sell';
export type TradeStatus = 'open' | 'closed';

/**
 * A trade = all deals of one position. Money is stored as INTEGER units scaled by 10^moneyDigits
 * (field suffix `U`), so sums stay exact. Convert with `fromUnits` only for display.
 */
export interface Trade {
  key: string; // `${accountId}:${positionId}`
  accountId: number;
  positionId: number;
  symbolId: number;
  symbol: string;
  side: Side;
  volume: number; // units (lots * contract size), = cents / 100
  closedVolume: number; // units
  entryPrice: number;
  exitPrice: number | null;
  openTime: number;
  closeTime: number | null;
  grossU: number;
  swapU: number;
  commissionU: number;
  feeU: number; // pnlConversionFee
  netU: number;
  moneyDigits: number;
  durationMs: number | null;
  status: TradeStatus;
  dealCount: number;
  partialCloses: number;
}

export interface CashFlow {
  key: string; // `${accountId}:${balanceHistoryId}`
  accountId: number;
  id: number;
  type: number; // ProtoOAChangeBalanceType
  deltaU: number;
  balanceU: number;
  moneyDigits: number;
  time: number;
  note?: string;
}

export interface Account {
  id: number; // ctidTraderAccountId
  traderLogin?: number;
  broker: string;
  environment: 'demo' | 'live' | 'sample';
  currency: string;
  moneyDigits: number;
  balanceU?: number;
  lastSyncedAt?: number;
  /** Highest executionTimestamp seen, used for incremental sync. */
  syncCursor?: number;
  registrationTimestamp?: number;
  firstSyncDone?: boolean;
  enabled: boolean;
}

export interface JournalEntry {
  id: string; // `trade:${tradeKey}` or `day:${yyyy-MM-dd}`
  kind: 'trade' | 'day';
  ref: string;
  note: string;
  tags: string[];
  setup?: string;
  rating?: number;
  mistakes: string[];
  updatedAt: number;
}

export interface Settings {
  timezone: string;
  weekStartsOn: 0 | 1 | 6;
  currencyDisplay: 'symbol' | 'code';
  showWinRateInCalendar: boolean;
  demoData: boolean;
}
