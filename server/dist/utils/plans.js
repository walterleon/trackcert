"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_PLAN_NAMES = exports.PLAN_DEFAULTS = void 0;
exports.getPlanLimits = getPlanLimits;
// Default plan definitions (can be overridden from SystemConfig via admin panel)
exports.PLAN_DEFAULTS = {
    gratis: {
        monthlyCredits: 30,
        maxCampaigns: 1,
        trailRetentionHours: 24,
        maxPhotosPerMonth: 30,
        shareLinks: true,
        stopDetection: true,
    },
    pro: {
        monthlyCredits: 300,
        maxCampaigns: 5,
        trailRetentionHours: 7 * 24, // 7 days
        maxPhotosPerMonth: -1,
        shareLinks: true,
        stopDetection: true,
    },
    empresas: {
        monthlyCredits: 1500,
        maxCampaigns: -1,
        trailRetentionHours: 15 * 24, // 15 days
        maxPhotosPerMonth: -1,
        shareLinks: true,
        stopDetection: true,
    },
};
exports.VALID_PLAN_NAMES = Object.keys(exports.PLAN_DEFAULTS);
function getPlanLimits(planName) {
    return exports.PLAN_DEFAULTS[planName] || exports.PLAN_DEFAULTS.gratis;
}
