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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlans = void 0;
const configService_1 = require("../services/configService");
// ─── Public: get plans with dynamic pricing ──────────────────────────────────
const getPlans = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [
        // Pricing
        creditPriceArs, creditPriceUsd, creditPackSize, 
        // Gratis
        gratisCredits, gratisCampaigns, gratisTrail, gratisPhotos, gratisPriceArs, gratisPriceUsd, 
        // Pro
        proCredits, proCampaigns, proTrail, proPhotos, proPriceArs, proPriceUsd, 
        // Empresas
        empCredits, empCampaigns, empTrail, empPhotos, empPriceArs, empPriceUsd,] = yield Promise.all([
            (0, configService_1.getConfigNumber)('credit_price_ars'),
            (0, configService_1.getConfigNumber)('credit_price_usd'),
            (0, configService_1.getConfigNumber)('credit_pack_size'),
            (0, configService_1.getConfigNumber)('plan_gratis_monthly_credits'),
            (0, configService_1.getConfigNumber)('plan_gratis_max_campaigns'),
            (0, configService_1.getConfigNumber)('plan_gratis_trail_hours'),
            (0, configService_1.getConfigNumber)('plan_gratis_max_photos'),
            (0, configService_1.getConfigNumber)('plan_gratis_price_ars'),
            (0, configService_1.getConfigNumber)('plan_gratis_price_usd'),
            (0, configService_1.getConfigNumber)('plan_pro_monthly_credits'),
            (0, configService_1.getConfigNumber)('plan_pro_max_campaigns'),
            (0, configService_1.getConfigNumber)('plan_pro_trail_hours'),
            (0, configService_1.getConfigNumber)('plan_pro_max_photos'),
            (0, configService_1.getConfigNumber)('plan_pro_price_ars'),
            (0, configService_1.getConfigNumber)('plan_pro_price_usd'),
            (0, configService_1.getConfigNumber)('plan_empresas_monthly_credits'),
            (0, configService_1.getConfigNumber)('plan_empresas_max_campaigns'),
            (0, configService_1.getConfigNumber)('plan_empresas_trail_hours'),
            (0, configService_1.getConfigNumber)('plan_empresas_max_photos'),
            (0, configService_1.getConfigNumber)('plan_empresas_price_ars'),
            (0, configService_1.getConfigNumber)('plan_empresas_price_usd'),
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
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getPlans = getPlans;
