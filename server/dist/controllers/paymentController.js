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
exports.paymentHistoryHandler = exports.paymentStatusHandler = exports.cancelSub = exports.webhookHandler = exports.buyCredits = exports.changePlan = exports.subscribe = void 0;
exports.paymentRedirect = paymentRedirect;
const crypto_1 = __importDefault(require("crypto"));
const paymentService_1 = require("../services/paymentService");
const APP_URL = process.env.APP_URL || 'https://rastreoya.com';
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';
// ─── Subscribe to a plan ─────────────────────────────────────────────────────
const subscribe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.company.companyId;
        const { planName } = req.body;
        if (!planName) {
            res.status(400).json({ error: 'planName es requerido.' });
            return;
        }
        const result = yield (0, paymentService_1.createSubscription)(companyId, planName);
        res.json({ checkoutUrl: result.checkoutUrl });
    }
    catch (err) {
        console.error('[payment-ctrl] subscribe error:', err);
        res.status(400).json({ error: err.message || 'Error al crear suscripción.' });
    }
});
exports.subscribe = subscribe;
// ─── Change plan ─────────────────────────────────────────────────────────────
const changePlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.company.companyId;
        const { planName } = req.body;
        if (!planName) {
            res.status(400).json({ error: 'planName es requerido.' });
            return;
        }
        const result = yield (0, paymentService_1.changeSubscription)(companyId, planName);
        res.json({ checkoutUrl: result.checkoutUrl });
    }
    catch (err) {
        console.error('[payment-ctrl] changePlan error:', err);
        res.status(400).json({ error: err.message || 'Error al cambiar plan.' });
    }
});
exports.changePlan = changePlan;
// ─── Buy credit pack ────────────────────────────────────────────────────────
const buyCredits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.company.companyId;
        const { packId } = req.body;
        if (!packId) {
            res.status(400).json({ error: 'packId es requerido.' });
            return;
        }
        const result = yield (0, paymentService_1.createCreditPurchase)(companyId, String(packId));
        res.json({ checkoutUrl: result.checkoutUrl });
    }
    catch (err) {
        console.error('[payment-ctrl] buyCredits error:', err);
        res.status(400).json({ error: err.message || 'Error al crear compra.' });
    }
});
exports.buyCredits = buyCredits;
// ─── Webhook handler ─────────────────────────────────────────────────────────
const webhookHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    // Always return 200 to MercadoPago
    try {
        // Validate signature if secret is configured
        if (MP_WEBHOOK_SECRET) {
            const xSignature = req.headers['x-signature'];
            const xRequestId = req.headers['x-request-id'];
            if (!xSignature || !xRequestId) {
                console.warn('[webhook] Missing signature headers');
                res.sendStatus(200);
                return;
            }
            // Parse x-signature: ts=xxx,v1=hash
            const sigParts = {};
            for (const part of xSignature.split(',')) {
                const [key, value] = part.split('=', 2);
                if (key && value) {
                    sigParts[key.trim()] = value.trim();
                }
            }
            const ts = sigParts['ts'];
            const v1 = sigParts['v1'];
            if (!ts || !v1) {
                console.warn('[webhook] Invalid signature format');
                res.sendStatus(200);
                return;
            }
            // Get data.id from body
            const body = req.body;
            // Body may be a Buffer (from express.raw) or parsed object
            let parsedBody;
            if (Buffer.isBuffer(body)) {
                parsedBody = JSON.parse(body.toString());
            }
            else {
                parsedBody = body;
            }
            const dataId = (_a = parsedBody === null || parsedBody === void 0 ? void 0 : parsedBody.data) === null || _a === void 0 ? void 0 : _a.id;
            // Build manifest: id:{data.id};request-id:{x-request-id};ts:{ts};
            const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
            const hmac = crypto_1.default
                .createHmac('sha256', MP_WEBHOOK_SECRET)
                .update(manifest)
                .digest('hex');
            if (hmac !== v1) {
                console.warn('[webhook] Invalid signature');
                res.sendStatus(200);
                return;
            }
        }
        // Parse body (may be Buffer from express.raw)
        let parsedBody;
        if (Buffer.isBuffer(req.body)) {
            parsedBody = JSON.parse(req.body.toString());
        }
        else {
            parsedBody = req.body;
        }
        const type = (_b = parsedBody === null || parsedBody === void 0 ? void 0 : parsedBody.type) !== null && _b !== void 0 ? _b : '';
        const dataId = String((_d = (_c = parsedBody === null || parsedBody === void 0 ? void 0 : parsedBody.data) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : '');
        if (!dataId) {
            console.warn('[webhook] No data.id in webhook payload');
            res.sendStatus(200);
            return;
        }
        console.log(`[webhook] Received: type=${type}, data.id=${dataId}`);
        yield (0, paymentService_1.handleWebhook)(type, dataId);
        res.sendStatus(200);
    }
    catch (err) {
        console.error('[webhook] Error processing webhook:', err);
        // Always 200 to MercadoPago
        res.sendStatus(200);
    }
});
exports.webhookHandler = webhookHandler;
// ─── Cancel subscription ────────────────────────────────────────────────────
const cancelSub = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.company.companyId;
        yield (0, paymentService_1.cancelSubscription)(companyId);
        res.json({ success: true, message: 'Suscripción cancelada.' });
    }
    catch (err) {
        console.error('[payment-ctrl] cancelSub error:', err);
        res.status(400).json({ error: err.message || 'Error al cancelar suscripción.' });
    }
});
exports.cancelSub = cancelSub;
// ─── Payment status ──────────────────────────────────────────────────────────
const paymentStatusHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.company.companyId;
        const status = yield (0, paymentService_1.getPaymentStatus)(companyId);
        res.json(status);
    }
    catch (err) {
        console.error('[payment-ctrl] paymentStatus error:', err);
        res.status(500).json({ error: 'Error al obtener estado de pagos.' });
    }
});
exports.paymentStatusHandler = paymentStatusHandler;
// ─── Payment history ─────────────────────────────────────────────────────────
const paymentHistoryHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.company.companyId;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const history = yield (0, paymentService_1.getPaymentHistory)(companyId, page);
        res.json(history);
    }
    catch (err) {
        console.error('[payment-ctrl] paymentHistory error:', err);
        res.status(500).json({ error: 'Error al obtener historial de pagos.' });
    }
});
exports.paymentHistoryHandler = paymentHistoryHandler;
// ─── Payment redirect (factory) ──────────────────────────────────────────────
function paymentRedirect(status) {
    return (_req, res) => {
        res.redirect(`${APP_URL}/dashboard?payment=${status}`);
    };
}
