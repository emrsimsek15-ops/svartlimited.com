/**
 * cTrader Open API constants — the ONLY place payload type IDs live.
 *
 * Sources (verified 2026-11-19):
 *  - Payload IDs / fields / enums: github.com/spotware/openapi-proto-messages (main)
 *    OpenApiCommonModelMessages.proto (ProtoPayloadType) and OpenApiModelMessages.proto (ProtoOAPayloadType).
 *  - OAuth URLs, GET token exchange, hosts: github.com/spotware/OpenApiPy (ctrader_open_api/endpoints.py, auth.py)
 *    and github.com/spotware/OpenAPI.Net (Helpers/ApiInfo.cs).
 *  - JSON-over-WebSocket port 5036: help.ctrader.com/open-api (could not be fetched from the build
 *    environment — re-check there if connection fails). The protobuf/TCP port is 5035.
 *  - Rate limit: OpenApiPy throttles to 5 messages/second by default; ProtoOAErrorRes.retryAfter
 *    (seconds) is returned with errorCode BLOCKED_PAYLOAD_TYPE when a limit is hit.
 */
export const PT = {
  // ProtoPayloadType (common)
  ERROR_RES: 50,
  HEARTBEAT_EVENT: 51,
  // ProtoOAPayloadType
  APPLICATION_AUTH_REQ: 2100,
  APPLICATION_AUTH_RES: 2101,
  ACCOUNT_AUTH_REQ: 2102,
  ACCOUNT_AUTH_RES: 2103,
  ASSET_LIST_REQ: 2112,
  ASSET_LIST_RES: 2113,
  SYMBOLS_LIST_REQ: 2114,
  SYMBOLS_LIST_RES: 2115,
  TRADER_REQ: 2121,
  TRADER_RES: 2122,
  TRADER_UPDATE_EVENT: 2123,
  RECONCILE_REQ: 2124,
  RECONCILE_RES: 2125,
  EXECUTION_EVENT: 2126,
  ORDER_ERROR_EVENT: 2132,
  DEAL_LIST_REQ: 2133,
  DEAL_LIST_RES: 2134,
  OA_ERROR_RES: 2142,
  CASH_FLOW_HISTORY_LIST_REQ: 2143,
  CASH_FLOW_HISTORY_LIST_RES: 2144,
  ACCOUNTS_TOKEN_INVALIDATED_EVENT: 2147,
  CLIENT_DISCONNECT_EVENT: 2148,
  GET_ACCOUNTS_BY_ACCESS_TOKEN_REQ: 2149,
  GET_ACCOUNTS_BY_ACCESS_TOKEN_RES: 2150,
  ACCOUNT_DISCONNECT_EVENT: 2164,
  REFRESH_TOKEN_REQ: 2173,
  REFRESH_TOKEN_RES: 2174,
} as const;

export type PayloadType = (typeof PT)[keyof typeof PT];

export const ENDPOINTS = {
  demo: 'wss://demo.ctraderapi.com:5036',
  live: 'wss://live.ctraderapi.com:5036',
} as const;

export const OAUTH = {
  authorizeUrl: 'https://openapi.ctrader.com/apps/auth',
  /** GET with grant_type, code|refresh_token, redirect_uri, client_id, client_secret. */
  tokenUrl: 'https://openapi.ctrader.com/apps/token',
  scope: 'trading', // OpenApiPy default; "accounts" is the read-only scope.
} as const;

export const LIMITS = {
  /** Conservative throttle for historical requests (DealList, CashFlowHistory). */
  historicalPerSecond: 4,
  /** ProtoOACashFlowHistoryListReq: toTimestamp - fromTimestamp <= 604800000 (1 week). */
  cashFlowMaxRangeMs: 604_800_000,
  /** Older protos documented the same 1-week limit for ProtoOADealListReq; we keep 1-week chunks. */
  dealListMaxRangeMs: 604_800_000,
  dealListMaxRows: 1000,
  /** Proto comment: send a heartbeat if no other message for >30 s. */
  heartbeatMs: 10_000,
  requestTimeoutMs: 20_000,
  /** Re-fetch this much before the last synced timestamp on incremental sync. */
  incrementalOverlapMs: 2 * 3600_000,
  /** ProtoOADealListReq.toTimestamp upper bound. */
  maxTimestamp: 2_147_483_646_000,
} as const;

/** Enums (ProtoOAModelMessages). JSON payloads may carry either the number or the name. */
export const TRADE_SIDE = { BUY: 1, SELL: 2 } as const;
export const DEAL_STATUS = {
  FILLED: 2,
  PARTIALLY_FILLED: 3,
  REJECTED: 4,
  INTERNALLY_REJECTED: 5,
  ERROR: 6,
  MISSED: 7,
} as const;
export const EXECUTION_TYPE = {
  ORDER_ACCEPTED: 2,
  ORDER_FILLED: 3,
  ORDER_REPLACED: 4,
  ORDER_CANCELLED: 5,
  ORDER_EXPIRED: 6,
  ORDER_REJECTED: 7,
  ORDER_CANCEL_REJECTED: 8,
  SWAP: 9,
  DEPOSIT_WITHDRAW: 10,
  ORDER_PARTIAL_FILL: 11,
  BONUS_DEPOSIT_WITHDRAW: 12,
} as const;

export function enumValue<T extends Record<string, number>>(map: T, v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return (map as Record<string, number>)[v] ?? (Number.isFinite(+v) ? +v : undefined);
  return undefined;
}

/** ProtoOAErrorCode names we react to (OpenApiModelMessages.proto). */
export const ERR = {
  OA_AUTH_TOKEN_EXPIRED: 'OA_AUTH_TOKEN_EXPIRED',
  ACCOUNT_NOT_AUTHORIZED: 'ACCOUNT_NOT_AUTHORIZED',
  ALREADY_LOGGED_IN: 'ALREADY_LOGGED_IN',
  CH_CLIENT_AUTH_FAILURE: 'CH_CLIENT_AUTH_FAILURE',
  CH_ACCESS_TOKEN_INVALID: 'CH_ACCESS_TOKEN_INVALID',
  BLOCKED_PAYLOAD_TYPE: 'BLOCKED_PAYLOAD_TYPE',
} as const;

/** Historical requests — throttled separately. */
export const HISTORICAL = new Set<number>([PT.DEAL_LIST_REQ, PT.CASH_FLOW_HISTORY_LIST_REQ]);
