export interface PlanLimits {
  monthlyCredits: number;
  maxCampaigns: number;       // -1 = unlimited
  trailRetentionHours: number;
  maxPhotosPerMonth: number;  // -1 = unlimited
  shareLinks: boolean;
  stopDetection: boolean;
}

// Default plan definitions (can be overridden from SystemConfig via admin panel)
export const PLAN_DEFAULTS: Record<string, PlanLimits> = {
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

export const VALID_PLAN_NAMES = Object.keys(PLAN_DEFAULTS);

export function getPlanLimits(planName: string): PlanLimits {
  return PLAN_DEFAULTS[planName] || PLAN_DEFAULTS.gratis;
}
