import type { CashFlow, RawDeal } from '../lib/types';
import { DEAL_STATUS, TRADE_SIDE, enumValue } from './constants';

/* JSON payloads: int64 values may arrive as numbers or strings; enums as numbers or names. */
export const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : NaN);
const opt = (v: unknown): number | undefined => (v === undefined || v === null ? undefined : num(v));

type Obj = Record<string, unknown>;

export function normalizeDeal(accountId: number, raw: Obj): RawDeal {
  const dealId = num(raw.dealId);
  const cpd = raw.closePositionDetail as Obj | undefined;
  const side = enumValue(TRADE_SIDE, raw.tradeSide);
  return {
    key: `${accountId}:${dealId}`,
    accountId,
    dealId,
    orderId: num(raw.orderId),
    positionId: num(raw.positionId),
    volume: num(raw.volume),
    filledVolume: num(raw.filledVolume),
    symbolId: num(raw.symbolId),
    createTimestamp: num(raw.createTimestamp),
    executionTimestamp: num(raw.executionTimestamp),
    executionPrice: opt(raw.executionPrice),
    tradeSide: side === 2 ? 2 : 1,
    dealStatus: enumValue(DEAL_STATUS, raw.dealStatus) ?? 0,
    commission: opt(raw.commission),
    moneyDigits: opt(raw.moneyDigits),
    label: raw.label as string | undefined,
    comment: raw.comment as string | undefined,
    closePositionDetail: cpd
      ? {
          entryPrice: num(cpd.entryPrice),
          grossProfit: num(cpd.grossProfit ?? 0),
          swap: num(cpd.swap ?? 0),
          commission: num(cpd.commission ?? 0),
          balance: num(cpd.balance ?? 0),
          closedVolume: opt(cpd.closedVolume),
          moneyDigits: opt(cpd.moneyDigits),
          pnlConversionFee: opt(cpd.pnlConversionFee),
          quoteToDepositConversionRate: opt(cpd.quoteToDepositConversionRate),
          balanceVersion: opt(cpd.balanceVersion),
        }
      : undefined,
  };
}

const CASH_TYPES: Record<string, number> = { BALANCE_DEPOSIT: 0, BALANCE_WITHDRAW: 1 };

export function normalizeCashFlow(accountId: number, raw: Obj, fallbackDigits: number): CashFlow {
  const id = num(raw.balanceHistoryId);
  return {
    key: `${accountId}:${id}`,
    accountId,
    id,
    type: typeof raw.operationType === 'string' ? (CASH_TYPES[raw.operationType] ?? -1) : num(raw.operationType),
    deltaU: num(raw.delta),
    balanceU: num(raw.balance),
    moneyDigits: opt(raw.moneyDigits) ?? fallbackDigits,
    time: num(raw.changeBalanceTimestamp),
    note: raw.externalNote as string | undefined,
  };
}
