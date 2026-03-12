export interface PlanLimits {
  monthlyCredits: number;
  maxCampaigns: number;      // -1 = unlimited
  trailRetentionHours: number;
  maxPhotosPerMonth: number; // -1 = unlimited
  shareLinks: boolean;
  stopDetection: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
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

export function getPlanLimits(planName: string): PlanLimits {
  return PLAN_LIMITS[planName] || PLAN_LIMITS.free;
}
