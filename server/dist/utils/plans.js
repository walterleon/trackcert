"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_LIMITS = void 0;
exports.getPlanLimits = getPlanLimits;
exports.PLAN_LIMITS = {
    free: {
        monthlyCredits: 30,
        maxCampaigns: 1,
        trailRetentionHours: 24,
        maxPhotosPerMonth: 5,
        shareLinks: false,
        stopDetection: false,
    },
    starter: {
        monthlyCredits: 300,
        maxCampaigns: 5,
        trailRetentionHours: 7 * 24, // 7 days
        maxPhotosPerMonth: -1,
        shareLinks: true,
        stopDetection: true,
    },
    growth: {
        monthlyCredits: 1500,
        maxCampaigns: -1,
        trailRetentionHours: 30 * 24, // 30 days
        maxPhotosPerMonth: -1,
        shareLinks: true,
        stopDetection: true,
    },
    pro: {
        monthlyCredits: 1500,
        maxCampaigns: -1,
        trailRetentionHours: 30 * 24,
        maxPhotosPerMonth: -1,
        shareLinks: true,
        stopDetection: true,
    },
};
function getPlanLimits(planName) {
    return exports.PLAN_LIMITS[planName] || exports.PLAN_LIMITS.free;
}
