import { Request, Response } from 'express';
import { getConfigNumber } from '../services/configService';

// ─── Public: get plans with dynamic pricing ──────────────────────────────────

export const getPlans = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      // Pricing
      creditPriceArs, creditPriceUsd, creditPackSize,
      // Gratis
      gratisCredits, gratisCampaigns, gratisTrail, gratisPhotos, gratisPriceArs, gratisPriceUsd,
      // Pro
      proCredits, proCampaigns, proTrail, proPhotos, proPriceArs, proPriceUsd,
      // Empresas
      empCredits, empCampaigns, empTrail, empPhotos, empPriceArs, empPriceUsd,
    ] = await Promise.all([
      getConfigNumber('credit_price_ars'),
      getConfigNumber('credit_price_usd'),
      getConfigNumber('credit_pack_size'),
      getConfigNumber('plan_gratis_monthly_credits'),
      getConfigNumber('plan_gratis_max_campaigns'),
      getConfigNumber('plan_gratis_trail_hours'),
      getConfigNumber('plan_gratis_max_photos'),
      getConfigNumber('plan_gratis_price_ars'),
      getConfigNumber('plan_gratis_price_usd'),
      getConfigNumber('plan_pro_monthly_credits'),
      getConfigNumber('plan_pro_max_campaigns'),
      getConfigNumber('plan_pro_trail_hours'),
      getConfigNumber('plan_pro_max_photos'),
      getConfigNumber('plan_pro_price_ars'),
      getConfigNumber('plan_pro_price_usd'),
      getConfigNumber('plan_empresas_monthly_credits'),
      getConfigNumber('plan_empresas_max_campaigns'),
      getConfigNumber('plan_empresas_trail_hours'),
      getConfigNumber('plan_empresas_max_photos'),
      getConfigNumber('plan_empresas_price_ars'),
      getConfigNumber('plan_empresas_price_usd'),
    ]);

    res.json({
      plans: [
        {
          name: 'gratis',
          monthlyCredits: gratisCredits,
          maxCampaigns: gratisCampaigns,
          trailHours: gratisTrail,
          maxPhotos: gratisPhotos,
          priceArs: gratisPriceArs,
          priceUsd: gratisPriceUsd,
        },
        {
          name: 'pro',
          monthlyCredits: proCredits,
          maxCampaigns: proCampaigns,
          trailHours: proTrail,
          maxPhotos: proPhotos,
          priceArs: proPriceArs,
          priceUsd: proPriceUsd,
        },
        {
          name: 'empresas',
          monthlyCredits: empCredits,
          maxCampaigns: empCampaigns,
          trailHours: empTrail,
          maxPhotos: empPhotos,
          priceArs: empPriceArs,
          priceUsd: empPriceUsd,
        },
      ],
      creditPriceArs,
      creditPriceUsd,
      creditPackSize,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};
