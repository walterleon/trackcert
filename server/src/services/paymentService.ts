import { MercadoPagoConfig, PreApproval, Preference, Payment as MPPayment } from 'mercadopago';
import prisma from '../db';
import { getConfig } from './configService';
import { getPlanLimits } from '../utils/plans';

// ─── MercadoPago config ──────────────────────────────────────────────────────

const MP_MODE = process.env.MP_MODE || 'sandbox';
const MP_ACCESS_TOKEN = MP_MODE === 'production'
  ? process.env.MP_ACCESS_TOKEN_PROD!
  : process.env.MP_ACCESS_TOKEN_TEST!;

const APP_URL = process.env.APP_URL || 'https://rastreoya.com';

const mpConfig = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
const preApproval = new PreApproval(mpConfig);
const preference = new Preference(mpConfig);
const mpPayment = new MPPayment(mpConfig);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function externalRef(type: 'sub' | 'credits', companyId: string, extra?: string): string {
  const ts = Date.now();
  if (type === 'credits') {
    return `rastreoya-credits-${companyId}-${extra}-${ts}`;
  }
  return `rastreoya-sub-${companyId}-${ts}`;
}

// ─── Create subscription ─────────────────────────────────────────────────────

export async function createSubscription(
  companyId: string,
  planName: string,
): Promise<{ checkoutUrl: string }> {
  // Validate plan
  if (planName !== 'pro' && planName !== 'empresas') {
    throw new Error('Plan inválido. Solo se puede suscribir a pro o empresas.');
  }

  // Concurrency guard: reject if active subscription exists
  const existing = await prisma.subscription.findFirst({
    where: {
      companyId,
      status: { in: ['active', 'grace_period'] },
    },
  });
  if (existing) {
    throw new Error('Ya tenés una suscripción activa. Cancelala primero o cambiá de plan.');
  }

  // Get company email (required by MercadoPago PreApproval)
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { email: true },
  });
  if (!company?.email) {
    throw new Error('Tu cuenta no tiene email configurado. Actualizá tu perfil.');
  }

  // Get price from config
  const priceKey = `plan_${planName}_price_ars`;
  const price = Number(await getConfig(priceKey));
  if (!price || price <= 0) {
    throw new Error('Precio del plan no configurado.');
  }

  const extRef = externalRef('sub', companyId);

  const result = await preApproval.create({
    body: {
      payer_email: company.email,
      reason: `RastreoYa - Plan ${planName.charAt(0).toUpperCase() + planName.slice(1)}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months' as const,
        transaction_amount: price,
        currency_id: 'ARS',
      },
      external_reference: extRef,
      back_url: `${APP_URL}/dashboard?payment=success`,
    },
  });

  // Create local subscription record
  await prisma.subscription.create({
    data: {
      companyId,
      planName,
      status: 'inactive',
      mercadopagoId: result.id ?? null,
      externalReference: extRef,
    },
  });

  return { checkoutUrl: result.init_point! };
}

// ─── Create credit purchase ──────────────────────────────────────────────────

export async function createCreditPurchase(
  companyId: string,
  packId: string,
): Promise<{ checkoutUrl: string }> {
  // Validate pack
  const validPacks = ['1', '2', '3'];
  if (!validPacks.includes(packId)) {
    throw new Error('Pack de créditos inválido.');
  }

  const sizeKey = `credit_pack_${packId}_size`;
  const priceKey = `credit_pack_${packId}_price_ars`;

  const [size, price] = await Promise.all([
    getConfig(sizeKey).then(Number),
    getConfig(priceKey).then(Number),
  ]);

  if (!size || !price || size <= 0 || price <= 0) {
    throw new Error('Pack de créditos no configurado.');
  }

  const extRef = externalRef('credits', companyId, `pack${packId}`);

  const result = await preference.create({
    body: {
      items: [
        {
          id: `credit-pack-${packId}`,
          title: `Pack ${size} créditos`,
          quantity: 1,
          unit_price: price,
          currency_id: 'ARS',
        },
      ],
      external_reference: extRef,
      back_urls: {
        success: `${APP_URL}/api/payments/success`,
        failure: `${APP_URL}/api/payments/failure`,
        pending: `${APP_URL}/api/payments/pending`,
      },
      auto_return: 'approved',
    },
  });

  return { checkoutUrl: result.init_point! };
}

// ─── Handle webhook ──────────────────────────────────────────────────────────

export async function handleWebhook(type: string, dataId: string): Promise<void> {
  if (type === 'payment') {
    await handlePaymentNotification(dataId);
  } else if (type === 'subscription_preapproval') {
    await handleSubscriptionNotification(dataId);
  }
  // Other types are silently ignored
}

async function handlePaymentNotification(paymentId: string): Promise<void> {
  // Idempotency: skip if we already processed this payment
  const existingPayment = await prisma.payment.findUnique({
    where: { mercadopagoPaymentId: paymentId },
  });
  if (existingPayment) {
    console.log(`[payments] Payment ${paymentId} already processed, skipping.`);
    return;
  }

  // Fetch payment details from MercadoPago
  const mpPay = await mpPayment.get({ id: Number(paymentId) });

  const extRef = mpPay.external_reference ?? '';
  const status = mpPay.status ?? 'unknown';
  const amount = mpPay.transaction_amount ?? 0;
  const currency = mpPay.currency_id ?? 'ARS';

  // Determine type and company from external reference
  const isSubscription = extRef.startsWith('rastreoya-sub-');
  const isCredits = extRef.startsWith('rastreoya-credits-');

  if (!isSubscription && !isCredits) {
    console.log(`[payments] Unknown external_reference: ${extRef}, skipping.`);
    return;
  }

  // Parse companyId from external reference
  // Format: rastreoya-sub-{companyId}-{timestamp}
  // Format: rastreoya-credits-{companyId}-pack{packId}-{timestamp}
  let companyId: string;
  let packId: string | null = null;

  if (isSubscription) {
    const parts = extRef.split('-');
    // rastreoya-sub-{uuid parts}-{timestamp}
    // UUID has 5 parts with dashes, so: rastreoya(0) - sub(1) - uuid(2-6) - timestamp(7)
    companyId = parts.slice(2, -1).join('-');
  } else {
    // rastreoya-credits-{uuid parts}-pack{id}-{timestamp}
    const packMatch = extRef.match(/rastreoya-credits-(.+)-pack(\d+)-\d+$/);
    if (!packMatch) {
      console.log(`[payments] Cannot parse credit ref: ${extRef}`);
      return;
    }
    companyId = packMatch[1];
    packId = packMatch[2];
  }

  // Verify company exists
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    console.log(`[payments] Company ${companyId} not found for payment ${paymentId}`);
    return;
  }

  // Map MP status
  const dbStatus = status === 'approved' ? 'approved'
    : status === 'pending' || status === 'in_process' ? 'pending'
    : 'rejected';

  // Calculate credits for credit packs
  let creditsGranted: number | null = null;
  if (isCredits && packId && dbStatus === 'approved') {
    const sizeKey = `credit_pack_${packId}_size`;
    creditsGranted = Number(await getConfig(sizeKey));
  }

  // For subscription payments, grant monthly credits on approval
  if (isSubscription && dbStatus === 'approved') {
    const sub = await prisma.subscription.findFirst({
      where: { companyId, externalReference: extRef },
    });
    if (sub) {
      const planLimits = getPlanLimits(sub.planName);
      creditsGranted = planLimits.monthlyCredits;
    }
  }

  // Atomic transaction: record payment + grant credits
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        companyId,
        type: isSubscription ? 'subscription' : 'credit_pack',
        mercadopagoPaymentId: paymentId,
        amount,
        currency,
        status: dbStatus,
        packId,
        creditsGranted,
      },
    });

    // Grant credits only on approved payments
    if (dbStatus === 'approved' && creditsGranted && creditsGranted > 0) {
      if (isCredits) {
        // Credit packs go to bonusCredits (never expire)
        await tx.company.update({
          where: { id: companyId },
          data: { bonusCredits: { increment: creditsGranted } },
        });
      } else {
        // Subscription payments grant monthly credits
        await tx.company.update({
          where: { id: companyId },
          data: { credits: { increment: creditsGranted } },
        });
      }

      await tx.creditTransaction.create({
        data: {
          companyId,
          amount: creditsGranted,
          reason: isCredits
            ? `Compra pack ${packId} (${creditsGranted} créditos) - MP #${paymentId}`
            : `Pago suscripción - MP #${paymentId}`,
        },
      });
    }
  });

  console.log(`[payments] Processed payment ${paymentId}: ${dbStatus}, credits: ${creditsGranted ?? 0}`);
}

async function handleSubscriptionNotification(preapprovalId: string): Promise<void> {
  // Fetch subscription status from MercadoPago
  const mpSub = await preApproval.get({ id: preapprovalId });

  const mpStatus = mpSub.status ?? '';
  const extRef = mpSub.external_reference ?? '';

  // Find our local subscription
  const sub = await prisma.subscription.findFirst({
    where: { mercadopagoId: preapprovalId },
  });

  if (!sub) {
    // Try by external reference
    const subByRef = await prisma.subscription.findFirst({
      where: { externalReference: extRef },
    });
    if (!subByRef) {
      console.log(`[payments] Subscription ${preapprovalId} not found locally.`);
      return;
    }
    // Update mercadopagoId
    await prisma.subscription.update({
      where: { id: subByRef.id },
      data: { mercadopagoId: preapprovalId },
    });
    await processSubscriptionStatus(subByRef.id, subByRef.companyId, subByRef.planName, mpStatus);
    return;
  }

  await processSubscriptionStatus(sub.id, sub.companyId, sub.planName, mpStatus);
}

async function processSubscriptionStatus(
  subId: string,
  companyId: string,
  planName: string,
  mpStatus: string,
): Promise<void> {
  let dbStatus: string;
  const now = new Date();

  switch (mpStatus) {
    case 'authorized':
    case 'active':
      dbStatus = 'active';
      break;
    case 'paused':
      dbStatus = 'grace_period';
      break;
    case 'cancelled':
    case 'expired':
      dbStatus = 'cancelled';
      break;
    default:
      dbStatus = 'inactive';
  }

  const nextRenewal = dbStatus === 'active'
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  const gracePeriodEnd = dbStatus === 'grace_period'
    ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days grace
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subId },
      data: {
        status: dbStatus,
        ...(dbStatus === 'active' && {
          startDate: now,
          lastPaymentDate: now,
          nextRenewalDate: nextRenewal,
        }),
        ...(dbStatus === 'grace_period' && {
          gracePeriodEnd,
        }),
        ...(dbStatus === 'cancelled' && {
          endDate: now,
        }),
      },
    });

    // Update company plan
    if (dbStatus === 'active') {
      await tx.company.update({
        where: { id: companyId },
        data: {
          planName,
          nextRenewalDate: nextRenewal,
        },
      });
    } else if (dbStatus === 'cancelled') {
      // Downgrade to gratis
      await tx.company.update({
        where: { id: companyId },
        data: {
          planName: 'gratis',
          nextRenewalDate: null,
        },
      });
    }
  });

  console.log(`[payments] Subscription ${subId} status updated to ${dbStatus} (MP: ${mpStatus})`);
}

// ─── Cancel subscription ─────────────────────────────────────────────────────

export async function cancelSubscription(companyId: string): Promise<void> {
  const sub = await prisma.subscription.findFirst({
    where: {
      companyId,
      status: { in: ['active', 'grace_period'] },
    },
  });

  if (!sub) {
    throw new Error('No tenés una suscripción activa para cancelar.');
  }

  // Cancel in MercadoPago
  if (sub.mercadopagoId) {
    try {
      await preApproval.update({
        id: sub.mercadopagoId,
        body: { status: 'cancelled' },
      });
    } catch (err) {
      console.error(`[payments] Error cancelling MP subscription ${sub.mercadopagoId}:`, err);
      // Continue with local cancellation even if MP fails
    }
  }

  // Update local records
  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'cancelled',
        endDate: new Date(),
      },
    });

    await tx.company.update({
      where: { id: companyId },
      data: {
        planName: 'gratis',
        nextRenewalDate: null,
      },
    });
  });

  console.log(`[payments] Subscription ${sub.id} cancelled for company ${companyId}`);
}

// ─── Change subscription ─────────────────────────────────────────────────────

export async function changeSubscription(
  companyId: string,
  newPlanName: string,
): Promise<{ checkoutUrl: string }> {
  if (newPlanName !== 'pro' && newPlanName !== 'empresas') {
    throw new Error('Plan inválido.');
  }

  // Cancel existing subscription if any
  const existingSub = await prisma.subscription.findFirst({
    where: {
      companyId,
      status: { in: ['active', 'grace_period'] },
    },
  });

  if (existingSub) {
    if (existingSub.planName === newPlanName) {
      throw new Error('Ya estás suscrito a este plan.');
    }
    await cancelSubscription(companyId);
  }

  // Create new subscription
  return createSubscription(companyId, newPlanName);
}

// ─── Get payment status ──────────────────────────────────────────────────────

export async function getPaymentStatus(companyId: string): Promise<{
  subscription: {
    planName: string;
    status: string;
    nextRenewalDate: Date | null;
    gracePeriodEnd: Date | null;
  } | null;
  company: {
    credits: number;
    bonusCredits: number;
    planName: string;
  };
}> {
  const [sub, company] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        companyId,
        status: { in: ['active', 'grace_period'] },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { credits: true, bonusCredits: true, planName: true },
    }),
  ]);

  return {
    subscription: sub
      ? {
          planName: sub.planName,
          status: sub.status,
          nextRenewalDate: sub.nextRenewalDate,
          gracePeriodEnd: sub.gracePeriodEnd,
        }
      : null,
    company: company ?? { credits: 0, bonusCredits: 0, planName: 'gratis' },
  };
}

// ─── Get payment history ─────────────────────────────────────────────────────

export async function getPaymentHistory(
  companyId: string,
  page: number = 1,
): Promise<{
  payments: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    creditsGranted: number | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
}> {
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        status: true,
        creditsGranted: true,
        createdAt: true,
      },
    }),
    prisma.payment.count({ where: { companyId } }),
  ]);

  return {
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    total,
    page,
    pageSize,
  };
}
