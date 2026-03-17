"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscription = createSubscription;
exports.createCreditPurchase = createCreditPurchase;
exports.handleWebhook = handleWebhook;
exports.cancelSubscription = cancelSubscription;
exports.changeSubscription = changeSubscription;
exports.getPaymentStatus = getPaymentStatus;
exports.getPaymentHistory = getPaymentHistory;
const mercadopago_1 = require("mercadopago");
const db_1 = __importDefault(require("../db"));
const configService_1 = require("./configService");
const plans_1 = require("../utils/plans");
// ─── MercadoPago config ──────────────────────────────────────────────────────
const MP_MODE = process.env.MP_MODE || 'sandbox';
const MP_ACCESS_TOKEN = MP_MODE === 'production'
    ? process.env.MP_ACCESS_TOKEN_PROD
    : process.env.MP_ACCESS_TOKEN_TEST;
const APP_URL = process.env.APP_URL || 'https://rastreoya.com';
const mpConfig = new mercadopago_1.MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
const preApproval = new mercadopago_1.PreApproval(mpConfig);
const preference = new mercadopago_1.Preference(mpConfig);
const mpPayment = new mercadopago_1.Payment(mpConfig);
// ─── Helpers ─────────────────────────────────────────────────────────────────
function externalRef(type, companyId, extra) {
    const ts = Date.now();
    if (type === 'credits') {
        return `rastreoya-credits-${companyId}-${extra}-${ts}`;
    }
    return `rastreoya-sub-${companyId}-${ts}`;
}
// ─── Create subscription ─────────────────────────────────────────────────────
function createSubscription(companyId, planName) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Validate plan
        if (planName !== 'pro' && planName !== 'empresas') {
            throw new Error('Plan inválido. Solo se puede suscribir a pro o empresas.');
        }
        // Concurrency guard: reject if active subscription exists
        const existing = yield db_1.default.subscription.findFirst({
            where: {
                companyId,
                status: { in: ['active', 'grace_period'] },
            },
        });
        if (existing) {
            throw new Error('Ya tenés una suscripción activa. Cancelala primero o cambiá de plan.');
        }
        // Get company email (required by MercadoPago PreApproval)
        const company = yield db_1.default.company.findUnique({
            where: { id: companyId },
            select: { email: true },
        });
        if (!(company === null || company === void 0 ? void 0 : company.email)) {
            throw new Error('Tu cuenta no tiene email configurado. Actualizá tu perfil.');
        }
        // Get price from config
        const priceKey = `plan_${planName}_price_ars`;
        const price = Number(yield (0, configService_1.getConfig)(priceKey));
        if (!price || price <= 0) {
            throw new Error('Precio del plan no configurado.');
        }
        const extRef = externalRef('sub', companyId);
        const result = yield preApproval.create({
            body: {
                payer_email: company.email,
                reason: `RastreoYa - Plan ${planName.charAt(0).toUpperCase() + planName.slice(1)}`,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: price,
                    currency_id: 'ARS',
                },
                external_reference: extRef,
                back_url: `${APP_URL}/api/payments/success`,
            },
        });
        // Create local subscription record
        yield db_1.default.subscription.create({
            data: {
                companyId,
                planName,
                status: 'inactive',
                mercadopagoId: (_a = result.id) !== null && _a !== void 0 ? _a : null,
                externalReference: extRef,
            },
        });
        return { checkoutUrl: result.init_point };
    });
}
// ─── Create credit purchase ──────────────────────────────────────────────────
function createCreditPurchase(companyId, packId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate pack
        const validPacks = ['1', '2', '3'];
        if (!validPacks.includes(packId)) {
            throw new Error('Pack de créditos inválido.');
        }
        const sizeKey = `credit_pack_${packId}_size`;
        const priceKey = `credit_pack_${packId}_price_ars`;
        const [size, price] = yield Promise.all([
            (0, configService_1.getConfig)(sizeKey).then(Number),
            (0, configService_1.getConfig)(priceKey).then(Number),
        ]);
        if (!size || !price || size <= 0 || price <= 0) {
            throw new Error('Pack de créditos no configurado.');
        }
        const extRef = externalRef('credits', companyId, `pack${packId}`);
        const result = yield preference.create({
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
        return { checkoutUrl: result.init_point };
    });
}
// ─── Handle webhook ──────────────────────────────────────────────────────────
function handleWebhook(type, dataId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (type === 'payment') {
            yield handlePaymentNotification(dataId);
        }
        else if (type === 'subscription_preapproval') {
            yield handleSubscriptionNotification(dataId);
        }
        // Other types are silently ignored
    });
}
function handlePaymentNotification(paymentId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        // Idempotency: skip if we already processed this payment
        const existingPayment = yield db_1.default.payment.findUnique({
            where: { mercadopagoPaymentId: paymentId },
        });
        if (existingPayment) {
            console.log(`[payments] Payment ${paymentId} already processed, skipping.`);
            return;
        }
        // Fetch payment details from MercadoPago
        const mpPay = yield mpPayment.get({ id: Number(paymentId) });
        const extRef = (_a = mpPay.external_reference) !== null && _a !== void 0 ? _a : '';
        const status = (_b = mpPay.status) !== null && _b !== void 0 ? _b : 'unknown';
        const amount = (_c = mpPay.transaction_amount) !== null && _c !== void 0 ? _c : 0;
        const currency = (_d = mpPay.currency_id) !== null && _d !== void 0 ? _d : 'ARS';
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
        let companyId;
        let packId = null;
        if (isSubscription) {
            const parts = extRef.split('-');
            // rastreoya-sub-{uuid parts}-{timestamp}
            // UUID has 5 parts with dashes, so: rastreoya(0) - sub(1) - uuid(2-6) - timestamp(7)
            companyId = parts.slice(2, -1).join('-');
        }
        else {
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
        const company = yield db_1.default.company.findUnique({ where: { id: companyId } });
        if (!company) {
            console.log(`[payments] Company ${companyId} not found for payment ${paymentId}`);
            return;
        }
        // Map MP status
        const dbStatus = status === 'approved' ? 'approved'
            : status === 'pending' || status === 'in_process' ? 'pending'
                : 'rejected';
        // Calculate credits for credit packs
        let creditsGranted = null;
        if (isCredits && packId && dbStatus === 'approved') {
            const sizeKey = `credit_pack_${packId}_size`;
            creditsGranted = Number(yield (0, configService_1.getConfig)(sizeKey));
        }
        // For subscription payments, grant monthly credits on approval
        if (isSubscription && dbStatus === 'approved') {
            const sub = yield db_1.default.subscription.findFirst({
                where: { companyId, externalReference: extRef },
            });
            if (sub) {
                const planLimits = (0, plans_1.getPlanLimits)(sub.planName);
                creditsGranted = planLimits.monthlyCredits;
            }
        }
        // Atomic transaction: record payment + grant credits
        yield db_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            yield tx.payment.create({
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
                    yield tx.company.update({
                        where: { id: companyId },
                        data: { bonusCredits: { increment: creditsGranted } },
                    });
                }
                else {
                    // Subscription payments grant monthly credits
                    yield tx.company.update({
                        where: { id: companyId },
                        data: { credits: { increment: creditsGranted } },
                    });
                }
                yield tx.creditTransaction.create({
                    data: {
                        companyId,
                        amount: creditsGranted,
                        reason: isCredits
                            ? `Compra pack ${packId} (${creditsGranted} créditos) - MP #${paymentId}`
                            : `Pago suscripción - MP #${paymentId}`,
                    },
                });
            }
        }));
        console.log(`[payments] Processed payment ${paymentId}: ${dbStatus}, credits: ${creditsGranted !== null && creditsGranted !== void 0 ? creditsGranted : 0}`);
    });
}
function handleSubscriptionNotification(preapprovalId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        // Fetch subscription status from MercadoPago
        const mpSub = yield preApproval.get({ id: preapprovalId });
        const mpStatus = (_a = mpSub.status) !== null && _a !== void 0 ? _a : '';
        const extRef = (_b = mpSub.external_reference) !== null && _b !== void 0 ? _b : '';
        // Find our local subscription
        const sub = yield db_1.default.subscription.findFirst({
            where: { mercadopagoId: preapprovalId },
        });
        if (!sub) {
            // Try by external reference
            const subByRef = yield db_1.default.subscription.findFirst({
                where: { externalReference: extRef },
            });
            if (!subByRef) {
                console.log(`[payments] Subscription ${preapprovalId} not found locally.`);
                return;
            }
            // Update mercadopagoId
            yield db_1.default.subscription.update({
                where: { id: subByRef.id },
                data: { mercadopagoId: preapprovalId },
            });
            yield processSubscriptionStatus(subByRef.id, subByRef.companyId, subByRef.planName, mpStatus);
            return;
        }
        yield processSubscriptionStatus(sub.id, sub.companyId, sub.planName, mpStatus);
    });
}
function processSubscriptionStatus(subId, companyId, planName, mpStatus) {
    return __awaiter(this, void 0, void 0, function* () {
        let dbStatus;
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
        yield db_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            yield tx.subscription.update({
                where: { id: subId },
                data: Object.assign(Object.assign(Object.assign({ status: dbStatus }, (dbStatus === 'active' && {
                    startDate: now,
                    lastPaymentDate: now,
                    nextRenewalDate: nextRenewal,
                })), (dbStatus === 'grace_period' && {
                    gracePeriodEnd,
                })), (dbStatus === 'cancelled' && {
                    endDate: now,
                })),
            });
            // Update company plan
            if (dbStatus === 'active') {
                yield tx.company.update({
                    where: { id: companyId },
                    data: {
                        planName,
                        nextRenewalDate: nextRenewal,
                    },
                });
            }
            else if (dbStatus === 'cancelled') {
                // Downgrade to gratis
                yield tx.company.update({
                    where: { id: companyId },
                    data: {
                        planName: 'gratis',
                        nextRenewalDate: null,
                    },
                });
            }
        }));
        console.log(`[payments] Subscription ${subId} status updated to ${dbStatus} (MP: ${mpStatus})`);
    });
}
// ─── Cancel subscription ─────────────────────────────────────────────────────
function cancelSubscription(companyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const sub = yield db_1.default.subscription.findFirst({
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
                yield preApproval.update({
                    id: sub.mercadopagoId,
                    body: { status: 'cancelled' },
                });
            }
            catch (err) {
                console.error(`[payments] Error cancelling MP subscription ${sub.mercadopagoId}:`, err);
                // Continue with local cancellation even if MP fails
            }
        }
        // Update local records
        yield db_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            yield tx.subscription.update({
                where: { id: sub.id },
                data: {
                    status: 'cancelled',
                    endDate: new Date(),
                },
            });
            yield tx.company.update({
                where: { id: companyId },
                data: {
                    planName: 'gratis',
                    nextRenewalDate: null,
                },
            });
        }));
        console.log(`[payments] Subscription ${sub.id} cancelled for company ${companyId}`);
    });
}
// ─── Change subscription ─────────────────────────────────────────────────────
function changeSubscription(companyId, newPlanName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (newPlanName !== 'pro' && newPlanName !== 'empresas') {
            throw new Error('Plan inválido.');
        }
        // Cancel existing subscription if any
        const existingSub = yield db_1.default.subscription.findFirst({
            where: {
                companyId,
                status: { in: ['active', 'grace_period'] },
            },
        });
        if (existingSub) {
            if (existingSub.planName === newPlanName) {
                throw new Error('Ya estás suscrito a este plan.');
            }
            yield cancelSubscription(companyId);
        }
        // Create new subscription
        return createSubscription(companyId, newPlanName);
    });
}
// ─── Get payment status ──────────────────────────────────────────────────────
function getPaymentStatus(companyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [sub, company] = yield Promise.all([
            db_1.default.subscription.findFirst({
                where: {
                    companyId,
                    status: { in: ['active', 'grace_period'] },
                },
                orderBy: { createdAt: 'desc' },
            }),
            db_1.default.company.findUnique({
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
            company: company !== null && company !== void 0 ? company : { credits: 0, bonusCredits: 0, planName: 'gratis' },
        };
    });
}
// ─── Get payment history ─────────────────────────────────────────────────────
function getPaymentHistory(companyId_1) {
    return __awaiter(this, arguments, void 0, function* (companyId, page = 1) {
        const pageSize = 20;
        const skip = (page - 1) * pageSize;
        const [payments, total] = yield Promise.all([
            db_1.default.payment.findMany({
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
            db_1.default.payment.count({ where: { companyId } }),
        ]);
        return {
            payments: payments.map((p) => (Object.assign(Object.assign({}, p), { amount: Number(p.amount) }))),
            total,
            page,
            pageSize,
        };
    });
}
