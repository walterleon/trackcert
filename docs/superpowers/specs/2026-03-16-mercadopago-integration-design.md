# MercadoPago Integration — Design Spec

**Date**: 2026-03-16
**Status**: Approved
**Author**: Claude + Walter

## Overview

Integrate MercadoPago into RastreoYa to automate payment collection for subscription plans (Pro/Empresas) and one-time credit pack purchases. Uses Checkout Pro (redirect flow) and native MP subscriptions (`preapproval`) for recurring billing.

## Goals

1. Users can subscribe to Pro or Empresas plans with automatic monthly billing
2. Users can purchase bonus credit packs as one-time payments
3. All payment processing is fully automated via webhooks
4. Admins can configure pricing and pack sizes from the admin panel (SystemConfig)
5. Failed payments trigger a 5-day grace period before downgrading to free plan

## Architecture

### Payment Flow

```
User clicks "Subscribe" or "Buy Credits"
  → Backend creates MP preference/preapproval
  → Backend returns checkout URL
  → User redirected to MercadoPago
  → User pays
  → MP redirects user back to dashboard (?payment=success|failure|pending)
  → MP sends webhook to /api/webhooks/mercadopago
  → Backend validates signature (using raw body), processes payment
  → Credits/plan updated in DB
```

### Technology

- **SDK**: `mercadopago` official Node.js package
- **Subscriptions**: MP `preapproval` (automatic recurring payments)
- **Credit packs**: MP `preference` (Checkout Pro, one-time payment)
- **Notifications**: Webhook endpoint with signature validation

## Backend

### New Service: `server/src/services/paymentService.ts`

Encapsulates all MercadoPago logic:

- `createSubscription(companyId, planName)` — checks no active subscription exists (rejects if one does), creates MP `preapproval`, returns checkout URL. Uses `externalReference = rastreoya-sub-{companyId}-{timestamp}`
- `createCreditPurchase(companyId, packId)` — creates MP `preference`, returns checkout URL
- `handleWebhook(rawBody, signature, payload)` — validates signature against raw body, processes payment/subscription notifications
- `cancelSubscription(companyId)` — cancels MP subscription
- `changeSubscription(companyId, newPlanName)` — cancels current subscription, creates new one for the new plan. Credits switch immediately to new plan level.
- `getPaymentStatus(companyId)` — returns current subscription/payment state

### New Controller: `server/src/controllers/paymentController.ts`

Endpoints:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payments/subscribe` | Yes | Start subscription to Pro/Empresas |
| POST | `/api/payments/change-plan` | Yes | Upgrade/downgrade plan |
| POST | `/api/payments/buy-credits` | Yes | Purchase a credit pack |
| POST | `/api/webhooks/mercadopago` | No (signature validated) | Webhook receiver |
| POST | `/api/payments/cancel-subscription` | Yes | Cancel active subscription |
| GET | `/api/payments/status` | Yes | Current payment/subscription status |
| GET | `/api/payments/history` | Yes | Paginated payment history |
| GET | `/api/payments/success` | No | Redirect callback → dashboard?payment=success |
| GET | `/api/payments/failure` | No | Redirect callback → dashboard?payment=failure |
| GET | `/api/payments/pending` | No | Redirect callback → dashboard?payment=pending |

**Rate limiting**: Payment creation endpoints (`/subscribe`, `/buy-credits`, `/change-plan`) limited to 5 requests per minute per company using `express-rate-limit`.

### Webhook Route — Raw Body Requirement

The webhook route **must** be mounted before the global `express.json()` middleware, or `express.json()` must be configured with a `verify` callback that stores `req.rawBody`. This is required because MP's HMAC signature validation needs the raw request body bytes.

Implementation approach:
```typescript
// Mount webhook route BEFORE express.json()
app.post('/api/webhooks/mercadopago', express.raw({ type: 'application/json' }), webhookHandler);
// Then mount express.json() for everything else
app.use(express.json());
```

### Webhook Processing

When MP sends a webhook notification:

1. **Validate signature** using `MP_WEBHOOK_SECRET` against raw request body
2. **Check idempotency** — if `mercadopagoPaymentId` already exists in `Payment` table, skip
3. **Process by type** (wrapped in Prisma `$transaction`):
   - **Subscription payment approved**: renew monthly credits, update `Subscription.lastPaymentDate`, set `Subscription.nextRenewalDate` +1 month, update `Company.planName`
   - **Subscription payment failed**: set `Subscription.status = 'grace_period'`, set `gracePeriodEnd = now + 5 days`
   - **Credit pack payment approved**: add `bonusCredits` to company, create `CreditTransaction`
4. **Log** the `Payment` record

### Subscription Concurrency Guard

Before creating a new MP subscription, the service checks within a Prisma `$transaction`:
1. Query for any `Subscription` with `companyId` and `status IN ('active', 'grace_period')`
2. If found, reject with error "Ya tenés una suscripción activa"
3. Only then create the MP `preapproval` and local `Subscription` record

### Plan Changes (Upgrade/Downgrade)

When a user changes from Pro → Empresas or vice versa:
1. Cancel the current MP subscription via API
2. Set current `Subscription.status = 'cancelled'`
3. Create new `Subscription` + MP `preapproval` for the new plan
4. Update `Company.planName` and `Company.credits` to the new plan level immediately
5. Create `CreditTransaction` with reason "Cambio de plan: {old} → {new}"

### Grace Period Handling

Added to the existing `creditCron.ts`:

- On each daily run, check subscriptions with `status = 'grace_period'` and `gracePeriodEnd <= now`
- For expired grace periods: set `Company.planName = 'gratis'`, `Company.credits = 30`, `Subscription.status = 'cancelled'`
- Create `CreditTransaction` with reason "Plan cancelado por falta de pago"

### Subscription Reconciliation (Defensive)

A daily cron job (added to `creditCron.ts`) queries the MP API for all active subscriptions and reconciles with local state. Catches missed webhook notifications.

## Database

### Extend `Subscription` model

Additive changes to the existing model (keeps `startDate`, `endDate`):

```prisma
model Subscription {
  id                String    @id @default(uuid())
  companyId         String
  company           Company   @relation(fields: [companyId], references: [id])
  mercadopagoId     String?   // MP preapproval ID
  status            String    @default("inactive") // active, grace_period, cancelled, inactive
  planName          String    // pro, empresas
  startDate         DateTime  @default(now())
  endDate           DateTime?
  nextRenewalDate   DateTime?
  gracePeriodEnd    DateTime?
  lastPaymentDate   DateTime?
  externalReference String?   // format: rastreoya-sub-{companyId}-{timestamp}
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

**Migration note**: Existing `Subscription` rows (if any) need `status` updated from old values to match new semantics. A data migration script should map: `active` → `active`, `cancelled` → `cancelled`, `expired` → `cancelled`.

### New `Payment` model

```prisma
model Payment {
  id                    String   @id @default(uuid())
  companyId             String
  company               Company  @relation(fields: [companyId], references: [id])
  type                  String   // "subscription" | "credit_pack"
  mercadopagoPaymentId  String   @unique
  amount                Decimal  @db.Decimal(10, 2)
  currency              String   @default("ARS")
  status                String   // "approved", "pending", "rejected"
  packId                String?  // which credit pack (if type = credit_pack)
  creditsGranted        Int?     // how many credits were added
  createdAt             DateTime @default(now())
}
```

### New SystemConfig keys (credit packs)

Must be added to `CONFIG_DEFINITIONS` in `configService.ts`:

| Key | Default | Type | Category | Description |
|-----|---------|------|----------|-------------|
| `credit_pack_1_size` | 100 | number | pricing | Credits in pack 1 |
| `credit_pack_1_price_ars` | 15000 | number | pricing | Price in ARS for pack 1 |
| `credit_pack_2_size` | 300 | number | pricing | Credits in pack 2 |
| `credit_pack_2_price_ars` | 40000 | number | pricing | Price in ARS for pack 2 |
| `credit_pack_3_size` | 500 | number | pricing | Credits in pack 3 |
| `credit_pack_3_price_ars` | 60000 | number | pricing | Price in ARS for pack 3 |

**Deprecation**: Existing keys `credit_pack_size` and `credit_price_ars`/`credit_price_usd` are superseded by the per-pack keys above. They should be kept for backward compatibility but marked as deprecated in their labels.

Existing plan pricing keys remain: `plan_pro_price_ars`, `plan_empresas_price_ars`, etc.

## Frontend

### New Section: "Plan y Facturacion" in Dashboard

Located as a new tab/section in the existing dashboard (`DashboardPage.tsx`):

**Components:**

1. **PlanStatus** — current plan, credits remaining, next renewal, subscription status
2. **PlanSelector** — 3 plan cards (gratis/pro/empresas), current highlighted, "Subscribe"/"Change" button on others
3. **CreditPackSelector** — 3 pack cards with size/price, "Buy" button
4. **PaymentHistory** — paginated table of past payments (date, amount, type, status)
5. **CancelSubscription** — button with confirmation dialog

**Alerts (integrated into existing dashboard):**
- Credits < 10: amber banner with "Buy credits" link
- Credits = 0: red banner (existing) enhanced with "Buy credits" button
- Grace period: red banner "Payment failed, X days to resolve"
- Payment success/failure/pending: inline alert based on URL query params (uses existing alert pattern, no toast library needed)

**Important**: The SPA must NOT trust URL query params for payment state. After detecting `?payment=success`, it calls `GET /api/payments/status` to get the actual current state.

### Redirect callbacks

The `GET /api/payments/success|failure|pending` endpoints only redirect to the SPA with a simple status query param. They do NOT expose MP payment IDs or external references in the redirect URL.

### API Client (`companyApi.ts`)

New functions:
- `apiSubscribePlan(planName)` → POST `/api/payments/subscribe`
- `apiChangePlan(planName)` → POST `/api/payments/change-plan`
- `apiBuyCredits(packId)` → POST `/api/payments/buy-credits`
- `apiCancelSubscription()` → POST `/api/payments/cancel-subscription`
- `apiGetPaymentStatus()` → GET `/api/payments/status`
- `apiGetPaymentHistory(page?)` → GET `/api/payments/history`

## Environment Variables

```env
MP_ACCESS_TOKEN=APP_USR-...          # Production access token
MP_ACCESS_TOKEN_TEST=TEST-...        # Sandbox access token
MP_WEBHOOK_SECRET=...                # Webhook signature secret
MP_MODE=sandbox                      # "sandbox" or "production"
```

**Startup validation**: Server logs which MP mode is active on boot. If `MP_ACCESS_TOKEN` is missing in production mode, server refuses to start.

## Security

1. **Webhook signature validation**: every incoming webhook is verified against raw body + `MP_WEBHOOK_SECRET`
2. **Idempotency**: `mercadopagoPaymentId` is `@unique` — duplicate webhooks are safely ignored
3. **Concurrency guard**: subscription creation wrapped in transaction, rejects if active subscription exists
4. **No sensitive data in client**: access tokens only on server, client only receives checkout URLs
5. **Sandbox/Production toggle**: `MP_MODE` env var switches between test and production credentials
6. **Auth required**: all payment endpoints (except webhook and redirects) require JWT authentication
7. **Rate limiting**: 5 req/min per company on payment creation endpoints
8. **Redirect safety**: callback endpoints only pass simple status param, SPA verifies via API
9. **Audit trail**: every payment logged in `Payment` model, every credit change in `CreditTransaction`
10. **Decimal for money**: `Decimal(10,2)` in DB, no floating-point arithmetic for currency

## Testing Strategy

1. **Sandbox mode**: use MP test credentials for development
2. **Webhook testing**: use MP's webhook simulator or ngrok for local dev
3. **Edge cases**: duplicate webhooks, failed payments, grace period expiry, concurrent subscription creation, plan changes mid-cycle
4. **Reconciliation**: verify daily cron catches missed webhooks
