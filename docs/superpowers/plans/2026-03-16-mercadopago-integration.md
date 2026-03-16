# MercadoPago Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate MercadoPago Checkout Pro for automated subscription billing and one-time credit pack purchases in RastreoYa.

**Architecture:** Express backend with new `paymentService.ts` + `paymentController.ts`. Webhook receives MP notifications, updates credits/plans in DB. React frontend adds "Plan y Facturación" section to dashboard.

**Tech Stack:** `mercadopago` SDK (Node.js), Prisma (MySQL), Express, React + Vite

**Spec:** `docs/superpowers/specs/2026-03-16-mercadopago-integration-design.md`

---

## Chunk 1: Database & Configuration

### Task 1: Install MercadoPago SDK

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Install mercadopago SDK**

```bash
cd /c/CLAUDE/RASTREOYA/server && npm install mercadopago
```

- [ ] **Step 2: Verify installation**

```bash
cd /c/CLAUDE/RASTREOYA/server && node -e "const mp = require('mercadopago'); console.log('SDK loaded OK')"
```
Expected: "SDK loaded OK"

- [ ] **Step 3: Install express-rate-limit**

```bash
cd /c/CLAUDE/RASTREOYA/server && npm install express-rate-limit
```

- [ ] **Step 4: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add server/package.json server/package-lock.json
git commit -m "chore: add mercadopago SDK and express-rate-limit"
```

---

### Task 2: Extend Prisma Schema

**Files:**
- Modify: `server/prisma/schema.prisma` (Subscription model at lines 30-40, Company model at lines 11-28)

- [ ] **Step 1: Update Subscription model**

In `server/prisma/schema.prisma`, replace the Subscription model (lines 30-40) with:

```prisma
model Subscription {
  id                String    @id @default(uuid())
  companyId         String
  company           Company   @relation(fields: [companyId], references: [id])
  planName          String
  status            String    @default("inactive")
  startDate         DateTime  @default(now())
  endDate           DateTime?
  mercadopagoId     String?
  nextRenewalDate   DateTime?
  gracePeriodEnd    DateTime?
  lastPaymentDate   DateTime?
  externalReference String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

- [ ] **Step 2: Add Payment model**

Add after the Subscription model:

```prisma
model Payment {
  id                    String   @id @default(uuid())
  companyId             String
  company               Company  @relation(fields: [companyId], references: [id])
  type                  String
  mercadopagoPaymentId  String   @unique
  amount                Decimal  @db.Decimal(10, 2)
  currency              String   @default("ARS")
  status                String
  packId                String?
  creditsGranted        Int?
  createdAt             DateTime @default(now())
}
```

- [ ] **Step 3: Add Payment relation to Company model**

In the Company model (around line 24-25), add:

```prisma
payments          Payment[]
```

- [ ] **Step 4: Generate Prisma client and push schema**

```bash
cd /c/CLAUDE/RASTREOYA/server && npx prisma generate && npx prisma db push
```
Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 5: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add server/prisma/schema.prisma
git commit -m "feat: extend Subscription model and add Payment model for MercadoPago"
```

---

### Task 3: Add Credit Pack Config Keys

**Files:**
- Modify: `server/src/services/configService.ts` (CONFIG_DEFINITIONS at lines 18-114)

- [ ] **Step 1: Add credit pack config definitions**

In `server/src/services/configService.ts`, inside the `CONFIG_DEFINITIONS` object (before the closing `}` around line 114), add:

```typescript
  credit_pack_1_size: {
    type: 'number',
    default: '100',
    label: 'Pack 1 - Cantidad de créditos',
    category: 'pricing',
    min: 10,
    max: 10000,
  },
  credit_pack_1_price_ars: {
    type: 'number',
    default: '15000',
    label: 'Pack 1 - Precio ARS',
    category: 'pricing',
    min: 100,
    max: 10000000,
  },
  credit_pack_2_size: {
    type: 'number',
    default: '300',
    label: 'Pack 2 - Cantidad de créditos',
    category: 'pricing',
    min: 10,
    max: 10000,
  },
  credit_pack_2_price_ars: {
    type: 'number',
    default: '40000',
    label: 'Pack 2 - Precio ARS',
    category: 'pricing',
    min: 100,
    max: 10000000,
  },
  credit_pack_3_size: {
    type: 'number',
    default: '500',
    label: 'Pack 3 - Cantidad de créditos',
    category: 'pricing',
    min: 10,
    max: 10000,
  },
  credit_pack_3_price_ars: {
    type: 'number',
    default: '60000',
    label: 'Pack 3 - Precio ARS',
    category: 'pricing',
    min: 100,
    max: 10000000,
  },
```

- [ ] **Step 2: Verify config loads without errors**

```bash
cd /c/CLAUDE/RASTREOYA/server && npx ts-node -e "import { getConfig } from './src/services/configService'; getConfig('credit_pack_1_size').then(v => console.log('Pack 1 size:', v))"
```

- [ ] **Step 3: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add server/src/services/configService.ts
git commit -m "feat: add credit pack config keys to SystemConfig"
```

---

### Task 4: Add Environment Variables

**Files:**
- Modify: `server/.env`

- [ ] **Step 1: Add MP env vars to .env**

Add to `server/.env`:

```env
MP_ACCESS_TOKEN=TEST-your-test-access-token
MP_WEBHOOK_SECRET=your-webhook-secret
MP_MODE=sandbox
```

- [ ] **Step 2: Commit** (do NOT commit .env — only document the vars)

No commit for .env. Just ensure the vars are documented in the spec.

---

## Chunk 2: Payment Service (Backend Core)

### Task 5: Create Payment Service

**Files:**
- Create: `server/src/services/paymentService.ts`

- [ ] **Step 1: Create the payment service file**

Create `server/src/services/paymentService.ts`:

```typescript
import { MercadoPagoConfig, PreApproval, Preference, Payment as MPPayment } from 'mercadopago';
import prisma from '../prismaClient';
import { getConfig } from './configService';
import { getPlanLimits } from '../utils/plans';

// Initialize MP client
function getMPClient() {
  const isProduction = process.env.MP_MODE === 'production';
  const accessToken = isProduction
    ? process.env.MP_ACCESS_TOKEN!
    : process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN!;

  return new MercadoPagoConfig({ accessToken });
}

function getBaseUrl(): string {
  return process.env.APP_URL || 'https://rastreoya.com';
}

// --- Subscriptions ---

export async function createSubscription(companyId: string, planName: string) {
  if (planName !== 'pro' && planName !== 'empresas') {
    throw new Error('Plan inválido. Debe ser "pro" o "empresas".');
  }

  // Concurrency guard: check no active subscription exists
  const existing = await prisma.subscription.findFirst({
    where: {
      companyId,
      status: { in: ['active', 'grace_period'] },
    },
  });
  if (existing) {
    throw new Error('Ya tenés una suscripción activa. Cancelala primero o cambiá de plan.');
  }

  const priceArs = Number(await getConfig(`plan_${planName}_price_ars`));
  const externalReference = `rastreoya-sub-${companyId}-${Date.now()}`;

  const client = getMPClient();
  const preApproval = new PreApproval(client);

  const result = await preApproval.create({
    body: {
      reason: `RastreoYa - Plan ${planName.charAt(0).toUpperCase() + planName.slice(1)}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: priceArs,
        currency_id: 'ARS',
      },
      external_reference: externalReference,
      back_url: `${getBaseUrl()}/api/payments/success`,
      payer_email: '', // MP will ask for email in checkout
    },
  });

  // Create local subscription record
  await prisma.subscription.create({
    data: {
      companyId,
      planName,
      status: 'inactive', // becomes 'active' when webhook confirms payment
      mercadopagoId: result.id?.toString() || null,
      externalReference,
    },
  });

  return { checkoutUrl: result.init_point };
}

export async function cancelSubscription(companyId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      companyId,
      status: { in: ['active', 'grace_period'] },
    },
  });

  if (!subscription) {
    throw new Error('No tenés una suscripción activa.');
  }

  // Cancel in MercadoPago
  if (subscription.mercadopagoId) {
    try {
      const client = getMPClient();
      const preApproval = new PreApproval(client);
      await preApproval.update({
        id: subscription.mercadopagoId,
        body: { status: 'cancelled' },
      });
    } catch (err) {
      console.error('Error cancelling MP subscription:', err);
    }
  }

  // Update local record
  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled', endDate: new Date() },
    }),
    prisma.company.update({
      where: { id: companyId },
      data: { planName: 'gratis', credits: 30 },
    }),
    prisma.creditTransaction.create({
      data: {
        companyId,
        amount: 0,
        reason: 'Suscripción cancelada - plan cambiado a gratis',
      },
    }),
  ]);

  return { success: true };
}

export async function changeSubscription(companyId: string, newPlanName: string) {
  if (newPlanName !== 'pro' && newPlanName !== 'empresas') {
    throw new Error('Plan inválido.');
  }

  // Cancel current subscription first
  await cancelSubscription(companyId);

  // Create new subscription
  return createSubscription(companyId, newPlanName);
}

// --- Credit Packs ---

export async function createCreditPurchase(companyId: string, packId: string) {
  if (!['1', '2', '3'].includes(packId)) {
    throw new Error('Pack inválido. Debe ser "1", "2" o "3".');
  }

  const packSize = Number(await getConfig(`credit_pack_${packId}_size`));
  const packPrice = Number(await getConfig(`credit_pack_${packId}_price_ars`));
  const externalReference = `rastreoya-credits-${companyId}-pack${packId}-${Date.now()}`;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error('Empresa no encontrada.');

  const client = getMPClient();
  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: [
        {
          id: `credit-pack-${packId}`,
          title: `RastreoYa - Pack de ${packSize} créditos`,
          quantity: 1,
          unit_price: packPrice,
          currency_id: 'ARS',
        },
      ],
      external_reference: externalReference,
      back_urls: {
        success: `${getBaseUrl()}/api/payments/success`,
        failure: `${getBaseUrl()}/api/payments/failure`,
        pending: `${getBaseUrl()}/api/payments/pending`,
      },
      auto_return: 'approved',
      metadata: {
        company_id: companyId,
        pack_id: packId,
        credits: packSize,
      },
    },
  });

  return { checkoutUrl: result.init_point };
}

// --- Webhook Processing ---

export async function handleWebhook(type: string, dataId: string) {
  const client = getMPClient();

  if (type === 'payment') {
    const mpPayment = new MPPayment(client);
    const payment = await mpPayment.get({ id: Number(dataId) });

    if (!payment || !payment.id) return { processed: false };

    const paymentId = payment.id.toString();

    // Idempotency check
    const existing = await prisma.payment.findUnique({
      where: { mercadopagoPaymentId: paymentId },
    });
    if (existing) return { processed: false, reason: 'duplicate' };

    const externalRef = payment.external_reference || '';
    const status = payment.status || '';

    // Determine if this is a credit pack purchase
    if (externalRef.startsWith('rastreoya-credits-')) {
      const parts = externalRef.split('-');
      const companyId = parts[2];
      const packId = parts[3]?.replace('pack', '') || '1';
      const packSize = Number(await getConfig(`credit_pack_${packId}_size`));

      await prisma.$transaction([
        prisma.payment.create({
          data: {
            companyId,
            type: 'credit_pack',
            mercadopagoPaymentId: paymentId,
            amount: payment.transaction_amount || 0,
            currency: payment.currency_id || 'ARS',
            status,
            packId,
            creditsGranted: status === 'approved' ? packSize : null,
          },
        }),
        ...(status === 'approved'
          ? [
              prisma.company.update({
                where: { id: companyId },
                data: { bonusCredits: { increment: packSize } },
              }),
              prisma.creditTransaction.create({
                data: {
                  companyId,
                  amount: packSize,
                  reason: `Compra de pack de ${packSize} créditos`,
                },
              }),
            ]
          : []),
      ]);

      return { processed: true, type: 'credit_pack', status };
    }

    return { processed: false, reason: 'unknown_reference' };
  }

  if (type === 'subscription_preapproval') {
    const preApproval = new PreApproval(client);
    const sub = await preApproval.get({ id: dataId });

    if (!sub || !sub.id) return { processed: false };

    const subscription = await prisma.subscription.findFirst({
      where: { mercadopagoId: sub.id.toString() },
    });
    if (!subscription) return { processed: false, reason: 'subscription_not_found' };

    const mpStatus = sub.status; // authorized, paused, cancelled

    if (mpStatus === 'authorized') {
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            lastPaymentDate: new Date(),
            nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gracePeriodEnd: null,
          },
        }),
        prisma.company.update({
          where: { id: subscription.companyId },
          data: {
            planName: subscription.planName,
            credits: getPlanLimits(subscription.planName).monthlyCredits,
          },
        }),
        prisma.creditTransaction.create({
          data: {
            companyId: subscription.companyId,
            amount: getPlanLimits(subscription.planName).monthlyCredits,
            reason: `Pago de suscripción plan ${subscription.planName}`,
          },
        }),
      ]);
      return { processed: true, type: 'subscription_activated' };
    }

    if (mpStatus === 'paused') {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'grace_period',
          gracePeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      });
      return { processed: true, type: 'subscription_grace_period' };
    }

    if (mpStatus === 'cancelled') {
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'cancelled', endDate: new Date() },
        }),
        prisma.company.update({
          where: { id: subscription.companyId },
          data: { planName: 'gratis', credits: 30 },
        }),
        prisma.creditTransaction.create({
          data: {
            companyId: subscription.companyId,
            amount: 0,
            reason: 'Suscripción cancelada por MercadoPago',
          },
        }),
      ]);
      return { processed: true, type: 'subscription_cancelled' };
    }
  }

  return { processed: false, reason: 'unhandled_type' };
}

// --- Status ---

export async function getPaymentStatus(companyId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      companyId,
      status: { in: ['active', 'grace_period', 'inactive'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  const company = await prisma.company.findUnique({ where: { id: companyId } });

  return {
    subscription: subscription
      ? {
          id: subscription.id,
          planName: subscription.planName,
          status: subscription.status,
          nextRenewalDate: subscription.nextRenewalDate,
          gracePeriodEnd: subscription.gracePeriodEnd,
          lastPaymentDate: subscription.lastPaymentDate,
        }
      : null,
    company: company
      ? {
          planName: company.planName,
          credits: company.credits,
          bonusCredits: company.bonusCredits,
          nextRenewalDate: company.nextRenewalDate,
        }
      : null,
  };
}

export async function getPaymentHistory(companyId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where: { companyId } }),
  ]);

  return { payments, total, page, totalPages: Math.ceil(total / limit) };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/CLAUDE/RASTREOYA/server && npx tsc --noEmit src/services/paymentService.ts 2>&1 | head -20
```

Fix any type errors that arise (MP SDK types may differ slightly — adapt imports).

- [ ] **Step 3: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add server/src/services/paymentService.ts
git commit -m "feat: add paymentService with MP subscription and credit pack logic"
```

---

### Task 6: Create Payment Controller

**Files:**
- Create: `server/src/controllers/paymentController.ts`

- [ ] **Step 1: Create the payment controller**

Create `server/src/controllers/paymentController.ts`:

```typescript
import { Request, Response } from 'express';
import crypto from 'crypto';
import {
  createSubscription,
  cancelSubscription,
  changeSubscription,
  createCreditPurchase,
  handleWebhook,
  getPaymentStatus,
  getPaymentHistory,
} from '../services/paymentService';

// POST /api/payments/subscribe
export async function subscribe(req: Request, res: Response) {
  try {
    const companyId = (req as any).company.id;
    const { planName } = req.body;

    if (!planName) {
      return res.status(400).json({ error: 'planName es requerido' });
    }

    const result = await createSubscription(companyId, planName);
    res.json(result);
  } catch (err: any) {
    console.error('Error creating subscription:', err);
    res.status(400).json({ error: err.message });
  }
}

// POST /api/payments/change-plan
export async function changePlan(req: Request, res: Response) {
  try {
    const companyId = (req as any).company.id;
    const { planName } = req.body;

    if (!planName) {
      return res.status(400).json({ error: 'planName es requerido' });
    }

    const result = await changeSubscription(companyId, planName);
    res.json(result);
  } catch (err: any) {
    console.error('Error changing plan:', err);
    res.status(400).json({ error: err.message });
  }
}

// POST /api/payments/buy-credits
export async function buyCredits(req: Request, res: Response) {
  try {
    const companyId = (req as any).company.id;
    const { packId } = req.body;

    if (!packId) {
      return res.status(400).json({ error: 'packId es requerido' });
    }

    const result = await createCreditPurchase(companyId, packId);
    res.json(result);
  } catch (err: any) {
    console.error('Error creating credit purchase:', err);
    res.status(400).json({ error: err.message });
  }
}

// POST /api/webhooks/mercadopago
export async function webhookHandler(req: Request, res: Response) {
  try {
    // Validate webhook signature
    const signature = req.headers['x-signature'] as string;
    const requestId = req.headers['x-request-id'] as string;

    if (process.env.MP_WEBHOOK_SECRET && signature) {
      const parts = signature.split(',');
      const tsHeader = parts.find(p => p.trim().startsWith('ts='));
      const hashHeader = parts.find(p => p.trim().startsWith('v1='));

      if (tsHeader && hashHeader) {
        const ts = tsHeader.trim().split('=')[1];
        const receivedHash = hashHeader.trim().split('=')[1];

        const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const payload = typeof req.body === 'object' && Buffer.isBuffer(req.body)
          ? req.body.toString()
          : body;

        const parsed = JSON.parse(payload);
        const dataId = parsed?.data?.id || '';

        const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
        const expectedHash = crypto
          .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
          .update(manifest)
          .digest('hex');

        if (receivedHash !== expectedHash) {
          console.warn('Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }
    }

    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    const { type, data } = body;

    if (!type || !data?.id) {
      return res.status(200).send('OK'); // Acknowledge but ignore
    }

    const result = await handleWebhook(type, data.id.toString());
    console.log('Webhook processed:', { type, dataId: data.id, result });

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(200).send('OK'); // Always return 200 to MP
  }
}

// POST /api/payments/cancel-subscription
export async function cancelSub(req: Request, res: Response) {
  try {
    const companyId = (req as any).company.id;
    const result = await cancelSubscription(companyId);
    res.json(result);
  } catch (err: any) {
    console.error('Error cancelling subscription:', err);
    res.status(400).json({ error: err.message });
  }
}

// GET /api/payments/status
export async function paymentStatus(req: Request, res: Response) {
  try {
    const companyId = (req as any).company.id;
    const result = await getPaymentStatus(companyId);
    res.json(result);
  } catch (err: any) {
    console.error('Error getting payment status:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/payments/history
export async function paymentHistoryHandler(req: Request, res: Response) {
  try {
    const companyId = (req as any).company.id;
    const page = parseInt(req.query.page as string) || 1;
    const result = await getPaymentHistory(companyId, page);
    res.json(result);
  } catch (err: any) {
    console.error('Error getting payment history:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/payments/success|failure|pending — Redirect callbacks
export function paymentRedirect(status: string) {
  return (_req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL || 'https://rastreoya.com';
    res.redirect(`${baseUrl}/dashboard?payment=${status}`);
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add server/src/controllers/paymentController.ts
git commit -m "feat: add paymentController with all payment endpoints"
```

---

### Task 7: Register Payment Routes

**Files:**
- Modify: `server/src/routes/api.ts` (lines 1-75)
- Modify: `server/src/index.ts` (line 32 — express.json)

- [ ] **Step 1: Mount webhook route before express.json() in index.ts**

In `server/src/index.ts`, BEFORE the `app.use(express.json())` line (line 32), add:

```typescript
import express from 'express';
import { webhookHandler } from './controllers/paymentController';

// Webhook needs raw body for signature validation — mount before express.json()
app.post('/api/webhooks/mercadopago', express.raw({ type: 'application/json' }), webhookHandler);
```

Note: `express` is likely already imported. Only add the import for `webhookHandler`.

- [ ] **Step 2: Add payment routes to api.ts**

In `server/src/routes/api.ts`, add the imports at the top:

```typescript
import {
  subscribe,
  changePlan,
  buyCredits,
  cancelSub,
  paymentStatus,
  paymentHistoryHandler,
  paymentRedirect,
} from '../controllers/paymentController';
import rateLimit from 'express-rate-limit';
```

Then add the routes (after the existing routes):

```typescript
// Payment rate limiter: 5 requests per minute per company
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => (req as any).company?.id || req.ip,
  message: { error: 'Demasiadas solicitudes de pago. Intentá de nuevo en un minuto.' },
});

// Payment routes (authenticated)
router.post('/payments/subscribe', authMiddleware, paymentLimiter, subscribe);
router.post('/payments/change-plan', authMiddleware, paymentLimiter, changePlan);
router.post('/payments/buy-credits', authMiddleware, paymentLimiter, buyCredits);
router.post('/payments/cancel-subscription', authMiddleware, cancelSub);
router.get('/payments/status', authMiddleware, paymentStatus);
router.get('/payments/history', authMiddleware, paymentHistoryHandler);

// Payment redirects (public — user returns from MP checkout)
router.get('/payments/success', paymentRedirect('success'));
router.get('/payments/failure', paymentRedirect('failure'));
router.get('/payments/pending', paymentRedirect('pending'));
```

- [ ] **Step 3: Add MP_MODE startup validation in index.ts**

At the top of the server startup in `server/src/index.ts` (after imports), add:

```typescript
// MercadoPago mode validation
const mpMode = process.env.MP_MODE || 'sandbox';
console.log(`[MercadoPago] Mode: ${mpMode}`);
if (mpMode === 'production' && !process.env.MP_ACCESS_TOKEN) {
  console.error('[MercadoPago] FATAL: MP_ACCESS_TOKEN not set in production mode');
  process.exit(1);
}
```

- [ ] **Step 4: Build and verify**

```bash
cd /c/CLAUDE/RASTREOYA/server && npx tsc
```
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add server/src/routes/api.ts server/src/index.ts
git commit -m "feat: register payment routes with rate limiting and webhook"
```

---

## Chunk 3: Grace Period Cron & Plans API Update

### Task 8: Add Grace Period Handling to Credit Cron

**Files:**
- Modify: `server/src/cron/creditCron.ts` (lines 10-42)

- [ ] **Step 1: Add grace period check to daily processing**

In `server/src/cron/creditCron.ts`, inside the daily processing block (after `processDailyCredits()` is called, around line 31), add:

```typescript
// Check expired grace periods
const expiredGrace = await prisma.subscription.findMany({
  where: {
    status: 'grace_period',
    gracePeriodEnd: { lte: new Date() },
  },
});

for (const sub of expiredGrace) {
  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'cancelled', endDate: new Date() },
    }),
    prisma.company.update({
      where: { id: sub.companyId },
      data: { planName: 'gratis', credits: 30 },
    }),
    prisma.creditTransaction.create({
      data: {
        companyId: sub.companyId,
        amount: 0,
        reason: 'Plan cancelado por falta de pago (gracia expirada)',
      },
    }),
  ]);
  console.log(`[CreditCron] Grace period expired for company ${sub.companyId}, downgraded to gratis`);
}
```

Add `import prisma from '../prismaClient';` at the top if not already imported.

- [ ] **Step 2: Build and verify**

```bash
cd /c/CLAUDE/RASTREOYA/server && npx tsc
```

- [ ] **Step 3: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add server/src/cron/creditCron.ts
git commit -m "feat: add grace period expiry check to credit cron"
```

---

### Task 9: Update Plans API to Include Credit Packs

**Files:**
- Modify: `server/src/controllers/plansController.ts` (lines 6-78)

- [ ] **Step 1: Add credit packs to the plans response**

In `server/src/controllers/plansController.ts`, in the `getPlans` handler, after fetching existing config values, fetch the pack values and add them to the response:

```typescript
// Fetch credit pack config
const pack1Size = Number(await getConfig('credit_pack_1_size'));
const pack1Price = Number(await getConfig('credit_pack_1_price_ars'));
const pack2Size = Number(await getConfig('credit_pack_2_size'));
const pack2Price = Number(await getConfig('credit_pack_2_price_ars'));
const pack3Size = Number(await getConfig('credit_pack_3_size'));
const pack3Price = Number(await getConfig('credit_pack_3_price_ars'));
```

And add to the response object:

```typescript
creditPacks: [
  { id: '1', size: pack1Size, priceArs: pack1Price },
  { id: '2', size: pack2Size, priceArs: pack2Price },
  { id: '3', size: pack3Size, priceArs: pack3Price },
],
```

- [ ] **Step 2: Build and verify**

```bash
cd /c/CLAUDE/RASTREOYA/server && npx tsc
```

- [ ] **Step 3: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add server/src/controllers/plansController.ts
git commit -m "feat: include credit packs in plans API response"
```

---

## Chunk 4: Frontend — Plan & Billing Section

### Task 10: Add Payment API Functions to Client

**Files:**
- Modify: `client/src/api/companyApi.ts`

- [ ] **Step 1: Add payment types and API functions**

In `client/src/api/companyApi.ts`, add these types and functions:

```typescript
// Payment types
export interface PaymentInfo {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  packId?: string;
  creditsGranted?: number;
  createdAt: string;
}

export interface SubscriptionInfo {
  id: string;
  planName: string;
  status: string;
  nextRenewalDate: string | null;
  gracePeriodEnd: string | null;
  lastPaymentDate: string | null;
}

export interface PaymentStatusResponse {
  subscription: SubscriptionInfo | null;
  company: {
    planName: string;
    credits: number;
    bonusCredits: number;
    nextRenewalDate: string | null;
  } | null;
}

export interface CreditPack {
  id: string;
  size: number;
  priceArs: number;
}

// Payment API functions
export async function apiSubscribePlan(planName: string) {
  const res = await fetch(`${API}/payments/subscribe`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ planName }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json() as Promise<{ checkoutUrl: string }>;
}

export async function apiChangePlan(planName: string) {
  const res = await fetch(`${API}/payments/change-plan`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ planName }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json() as Promise<{ checkoutUrl: string }>;
}

export async function apiBuyCredits(packId: string) {
  const res = await fetch(`${API}/payments/buy-credits`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ packId }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json() as Promise<{ checkoutUrl: string }>;
}

export async function apiCancelSubscription() {
  const res = await fetch(`${API}/payments/cancel-subscription`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function apiGetPaymentStatus() {
  const res = await fetch(`${API}/payments/status`, { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json() as Promise<PaymentStatusResponse>;
}

export async function apiGetPaymentHistory(page: number = 1) {
  const res = await fetch(`${API}/payments/history?page=${page}`, { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json() as Promise<{ payments: PaymentInfo[]; total: number; page: number; totalPages: number }>;
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add client/src/api/companyApi.ts
git commit -m "feat: add payment API functions to client"
```

---

### Task 11: Create Billing Section Component

**Files:**
- Create: `client/src/components/BillingSection.tsx`

- [ ] **Step 1: Create the BillingSection component**

Create `client/src/components/BillingSection.tsx` with the full billing UI:

- PlanStatus: shows current plan, credits, subscription status, grace period warning
- PlanSelector: 3 plan cards, subscribe/change buttons, opens MP checkout in new tab
- CreditPackSelector: 3 pack cards, buy buttons
- PaymentHistory: paginated table
- CancelSubscription: button with confirm dialog

The component fetches plans from `apiGetPlans()`, payment status from `apiGetPaymentStatus()`, and history from `apiGetPaymentHistory()`.

When user clicks Subscribe/Buy:
1. Call API → get `checkoutUrl`
2. `window.open(checkoutUrl, '_blank')` or `window.location.href = checkoutUrl`
3. On return, dashboard reads `?payment=` param and shows inline alert

Use existing Tailwind/CSS patterns from the dashboard. Use lucide-react icons (CreditCard, Crown, Coins, etc.).

This component will be approximately 250-350 lines covering all 5 sub-sections.

- [ ] **Step 2: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add client/src/components/BillingSection.tsx
git commit -m "feat: add BillingSection component with plans, packs, and history"
```

---

### Task 12: Integrate BillingSection into Dashboard

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx` (lines 10-107)

- [ ] **Step 1: Add billing section to dashboard**

In `client/src/pages/DashboardPage.tsx`:

1. Import: `import BillingSection from '../components/BillingSection';`
2. Add a tab or expandable section for "Plan y Facturación"
3. Check URL params on mount for `?payment=success|failure|pending` and show inline alert
4. Enhance existing credit warning (line 50-58) with a "Comprar créditos" button that scrolls to billing section

- [ ] **Step 2: Build client and verify**

```bash
cd /c/CLAUDE/RASTREOYA/client && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /c/CLAUDE/RASTREOYA && git add client/src/pages/DashboardPage.tsx
git commit -m "feat: integrate BillingSection into dashboard with payment alerts"
```

---

## Chunk 5: Build, Deploy & Test

### Task 13: Full Build and Local Test

**Files:**
- Modify: `server/dist/` (build output)
- Modify: `client/dist/` (build output)

- [ ] **Step 1: Build server**

```bash
cd /c/CLAUDE/RASTREOYA/server && npx tsc
```

- [ ] **Step 2: Build client**

```bash
cd /c/CLAUDE/RASTREOYA/client && npm run build
```

- [ ] **Step 3: Test server starts**

```bash
cd /c/CLAUDE/RASTREOYA/server && timeout 5 node dist/index.js 2>&1 || true
```
Expected: Server starts, shows `[MercadoPago] Mode: sandbox`, no errors.

- [ ] **Step 4: Test plans API returns credit packs**

```bash
curl -s http://localhost:3001/api/plans | jq '.creditPacks'
```
Expected: Array of 3 packs with id, size, priceArs.

- [ ] **Step 5: Commit build artifacts**

```bash
cd /c/CLAUDE/RASTREOYA && git add -f server/dist/ client/dist/
git commit -m "build: server and client dist with MercadoPago integration"
```

---

### Task 14: Deploy to VPS

- [ ] **Step 1: Push to GitHub**

```bash
cd /c/CLAUDE/RASTREOYA && git push origin main
```

- [ ] **Step 2: Deploy via cPanel terminal (Playwright)**

Open cPanel terminal and run:
```bash
cd /home/rascom/rastreoya/server && git checkout main && git pull origin main && pkill -f "node app.js"; sleep 2; nohup node app.js >> app.log 2>&1 &
```

- [ ] **Step 3: Add MP env vars on VPS**

In cPanel terminal, add MP env vars to `server/.env` on the VPS.

- [ ] **Step 4: Verify deployment**

```bash
curl -s https://rastreoya.com/api/plans | jq '.creditPacks'
```

- [ ] **Step 5: Test sandbox payment flow**

1. Login to dashboard
2. Go to billing section
3. Click "Comprar" on a credit pack
4. Complete sandbox payment in MP
5. Verify bonus credits were added
