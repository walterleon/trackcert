import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import {
  createSubscription,
  createCreditPurchase,
  handleWebhook,
  cancelSubscription,
  changeSubscription,
  getPaymentStatus,
  getPaymentHistory,
} from '../services/paymentService';

const APP_URL = process.env.APP_URL || 'https://rastreoya.com';
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';

// ─── Subscribe to a plan ─────────────────────────────────────────────────────

export const subscribe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.company!.companyId;
    const { planName } = req.body;

    if (!planName) {
      res.status(400).json({ error: 'planName es requerido.' });
      return;
    }

    const result = await createSubscription(companyId, planName);
    res.json({ checkoutUrl: result.checkoutUrl });
  } catch (err: any) {
    console.error('[payment-ctrl] subscribe error:', err);
    res.status(400).json({ error: err.message || 'Error al crear suscripción.' });
  }
};

// ─── Change plan ─────────────────────────────────────────────────────────────

export const changePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.company!.companyId;
    const { planName } = req.body;

    if (!planName) {
      res.status(400).json({ error: 'planName es requerido.' });
      return;
    }

    const result = await changeSubscription(companyId, planName);
    res.json({ checkoutUrl: result.checkoutUrl });
  } catch (err: any) {
    console.error('[payment-ctrl] changePlan error:', err);
    res.status(400).json({ error: err.message || 'Error al cambiar plan.' });
  }
};

// ─── Buy credit pack ────────────────────────────────────────────────────────

export const buyCredits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.company!.companyId;
    const { packId } = req.body;

    if (!packId) {
      res.status(400).json({ error: 'packId es requerido.' });
      return;
    }

    const result = await createCreditPurchase(companyId, String(packId));
    res.json({ checkoutUrl: result.checkoutUrl });
  } catch (err: any) {
    console.error('[payment-ctrl] buyCredits error:', err);
    res.status(400).json({ error: err.message || 'Error al crear compra.' });
  }
};

// ─── Webhook handler ─────────────────────────────────────────────────────────

export const webhookHandler = async (req: Request, res: Response): Promise<void> => {
  // Always return 200 to MercadoPago
  try {
    // Validate signature if secret is configured
    if (MP_WEBHOOK_SECRET) {
      const xSignature = req.headers['x-signature'] as string | undefined;
      const xRequestId = req.headers['x-request-id'] as string | undefined;

      if (!xSignature || !xRequestId) {
        console.warn('[webhook] Missing signature headers');
        res.sendStatus(200);
        return;
      }

      // Parse x-signature: ts=xxx,v1=hash
      const sigParts: Record<string, string> = {};
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
      let parsedBody: any;
      if (Buffer.isBuffer(body)) {
        parsedBody = JSON.parse(body.toString());
      } else {
        parsedBody = body;
      }

      const dataId = parsedBody?.data?.id;

      // Build manifest: id:{data.id};request-id:{x-request-id};ts:{ts};
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

      const hmac = crypto
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
    let parsedBody: any;
    if (Buffer.isBuffer(req.body)) {
      parsedBody = JSON.parse(req.body.toString());
    } else {
      parsedBody = req.body;
    }

    const type = parsedBody?.type ?? '';
    const dataId = String(parsedBody?.data?.id ?? '');

    if (!dataId) {
      console.warn('[webhook] No data.id in webhook payload');
      res.sendStatus(200);
      return;
    }

    console.log(`[webhook] Received: type=${type}, data.id=${dataId}`);

    await handleWebhook(type, dataId);

    res.sendStatus(200);
  } catch (err) {
    console.error('[webhook] Error processing webhook:', err);
    // Always 200 to MercadoPago
    res.sendStatus(200);
  }
};

// ─── Cancel subscription ────────────────────────────────────────────────────

export const cancelSub = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.company!.companyId;
    await cancelSubscription(companyId);
    res.json({ success: true, message: 'Suscripción cancelada.' });
  } catch (err: any) {
    console.error('[payment-ctrl] cancelSub error:', err);
    res.status(400).json({ error: err.message || 'Error al cancelar suscripción.' });
  }
};

// ─── Payment status ──────────────────────────────────────────────────────────

export const paymentStatusHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.company!.companyId;
    const status = await getPaymentStatus(companyId);
    res.json(status);
  } catch (err: any) {
    console.error('[payment-ctrl] paymentStatus error:', err);
    res.status(500).json({ error: 'Error al obtener estado de pagos.' });
  }
};

// ─── Payment history ─────────────────────────────────────────────────────────

export const paymentHistoryHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.company!.companyId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const history = await getPaymentHistory(companyId, page);
    res.json(history);
  } catch (err: any) {
    console.error('[payment-ctrl] paymentHistory error:', err);
    res.status(500).json({ error: 'Error al obtener historial de pagos.' });
  }
};

// ─── Payment redirect (factory) ──────────────────────────────────────────────

export function paymentRedirect(status: string) {
  return (_req: Request, res: Response): void => {
    res.redirect(`${APP_URL}/dashboard?payment=${status}`);
  };
}
