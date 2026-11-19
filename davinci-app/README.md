# Da Vinci — trade journal for cTrader

A local-first PWA journal. Trades sync from the **cTrader Open API** (JSON over WebSocket), are stored
only on the device (IndexedDB), and are shown with exact **net P&L** in a dashboard, trade list,
calendar and reports. UI language: Turkish (`src/i18n/tr.ts`, all strings in one file).

- Source: `davinci-app/`
- Build output: `davinci/` at the repo root → served by GitHub Pages at `https://svartlimited.com/davinci/`

## Run locally

```bash
cd davinci-app
npm install
npm run dev          # http://localhost:5173/davinci/
npm test             # unit tests (P&L, timezone bucketing, calendar totals, stats, sync)
npm run build        # type-check + production build into ../davinci
npm run screenshots  # responsive pass: needs `npm i -D playwright` (or a global Playwright)
npm run icons        # regenerate PWA icons from the logo mark
```

Turn on **Ayarlar → Örnek veri** (or the button on the empty dashboard) to load a seeded dataset
(~300 trades over 6 months) and try every screen before your Open API app is approved.

## Registering the Open API application

1. Sign in at <https://openapi.ctrader.com> with your cTrader ID and create an application.
2. Add the **redirect URI** exactly as the app shows it in *Ayarlar → cTrader bağlantısı*:
   - production: `https://svartlimited.com/davinci/`
   - local dev: `http://localhost:5173/davinci/`
3. Wait for approval, then copy the **Client ID** and **Client Secret** into *Ayarlar*.
4. Choose **Demo** or **Canlı** and press **cTrader ile bağlan**. You'll be sent to the cTrader consent
   page and back to the app with `?code=…`, which the app exchanges for tokens.
5. **If the token exchange is blocked by CORS** (the browser can't call `openapi.ctrader.com/apps/token`
   directly), the app tells you so. Open your application's **Playground** in the portal, generate an
   access token and refresh token, and paste them under **Token’ları elle gir**.
6. Press **Hesapları getir**, tick **Senkronize et** on the accounts you want, then **Şimdi senkronize et**.

Token refresh runs over the WebSocket (`ProtoOARefreshTokenReq`), so CORS doesn't affect it. Client
ID/secret and tokens live only in IndexedDB on that device. They are never exported in backups and
never committed. **Bağlantıyı kes ve kimlik bilgilerini sil** removes them.

## How the sync works

`ApplicationAuthReq → GetAccountListByAccessTokenReq → (select) → AccountAuthReq → TraderReq (+ AssetListReq
for the deposit currency) → SymbolsListReq (incl. archived) → ReconcileReq → DealListReq → CashFlowHistoryListReq`

- All payload type IDs live in `src/ctrader/constants.ts` (checked against Spotware's
  `openapi-proto-messages` and the official OpenApiPy / OpenAPI.Net SDKs).
- History is fetched in 1-week windows. If a response says `hasMore`, the window is split in half
  recursively, so no deal is lost whatever the server's row limit. Historical requests are throttled to
  4/s. `BLOCKED_PAYLOAD_TYPE` is retried after the server's `retryAfter`.
- **Incremental sync** runs on app open, when the app returns to the foreground and when the network
  comes back. It starts at the last synced deal timestamp minus a 2-hour overlap. Deals are upserted by
  `(accountId, dealId)` and only the touched positions are rebuilt, so re-syncing is idempotent.
- While the app is open, `ProtoOAExecutionEvent` updates deals and positions live. A heartbeat goes out
  every 10 s, and the socket reconnects with exponential backoff and re-authenticates.

## P&L rules

Money is kept as **integers scaled by 10^moneyDigits** and summed as integers. It is divided only for
display, so day totals add up exactly to week and month totals. Volume is in cents (÷100 = units).

Per position (all its deals = one trade, partial closes included):

```
gross      = Σ closePositionDetail.grossProfit
swap       = Σ closePositionDetail.swap
commission = Σ closePositionDetail.commission
fee        = Σ closePositionDetail.pnlConversionFee
net        = gross + swap + commission + fee
```

**Why commission comes from `closePositionDetail` and not Σ over every deal:** cTrader does not book
commission to the balance when a position opens. `ProtoOAPosition.commission` is documented as
*unrealized*. On close, `closePositionDetail.commission` is the realized commission for the closed
volume (entry share plus exit), which is what moves `closePositionDetail.balance`. Adding the opening
deal's own `commission` on top would count the entry side twice.

The **debug view** (*Ayarlar → Hata ayıklama görünümü*) checks this against your real data:

- For each position it shows the raw deals next to the computed net, and warns if
  Σ `deal.commission` ≠ Σ `closePositionDetail.commission`.
- A **balance chain** check verifies, for consecutive closes (balanceVersion n → n+1), that
  `previous balance + net == closePositionDetail.balance`. Green everywhere means the net figures
  match what cTrader actually booked.

Deposits and withdrawals are stored separately (`cashflows`) and never count as P&L.

## Calendar rules

- A trade belongs to the day of its **close time** in the timezone chosen in Settings (default: the
  device timezone). Conversion goes through `date-fns-tz`, so DST is handled by the tz database.
  Partial closes count on the day of the final close.
- The grid is always **6 × 7**, so its height never jumps between months. The week starts Monday by
  default (configurable).
- Days from adjacent months are dimmed, can't be clicked, and are never counted. Weekly totals also
  count only days of the shown month, so the weeks add up exactly to the month (covered by a test).
- Colour: green > 0, red < 0, neutral = breakeven. Intensity is `sqrt(|day| / max |day| in month)`,
  limited to 0.14–0.60 opacity; a unit test checks white text keeps ≥ 4.5:1 contrast. The year heatmap
  uses the same scale with the year's maximum.

Win rate = wins / (wins + losses), with breakeven trades excluded. Expectancy = average net per
trade. Max drawdown = largest peak-to-trough fall of cumulative closed-trade net, starting from 0.

## Deployment

**GitHub Pages (this repo):** `npm run build` writes to `../davinci/`. Commit that folder; Pages serves it
at `/davinci/`. The app uses hash routing, so no server rewrites are needed, and the service worker
scope is `/davinci/`.

**Cloudflare Pages / root deploy:** build with `BASE=/ OUT_DIR=dist npm run build` and set the output
directory to `davinci-app/dist`. Update the redirect URI in the Open API portal to match.

HTTPS is required (service worker, `wss://`, OAuth redirect).

## Install on iPhone

Open `https://svartlimited.com/davinci/` in Safari → Share → **Ana Ekrana Ekle**. The app opens full-screen,
respects the notch and home indicator, and works offline from the cached app shell and local data.

## Project layout

```
src/lib/        pure logic + tests: pnl.ts (deals→trades), aggregate.ts (daily/monthly/stats/reports),
                time.ts (tz day keys, month grid, periods), colorScale.ts, format.ts, demo.ts
src/ctrader/    constants.ts (payload IDs), client.ts (WebSocket), sync.ts, oauth.ts, controller.ts
src/db/         Dexie schema + repository (upserts, rebuilds, backup, wipe)
src/features/   dashboard, trades, calendar, reports, settings, debug, journal
src/components/ shell/nav, sheet, charts (SVG, no chart library), KPI count-up, etc.
```
