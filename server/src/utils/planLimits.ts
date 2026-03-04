export interface PlanLimits {
  maxWorkers: number;
  maxCampaigns: number;
  photosPerDay: number;
  historyDays: number;
  canExport: boolean;
  canShareLink: boolean;
}

const PLANS: Record<string, PlanLimits> = {
  free: {
    maxWorkers: 3,
    maxCampaigns: 1,
    photosPerDay: 10,
    historyDays: 1,
    canExport: false,
    canShareLink: false,
  },
  starter: {
    maxWorkers: 10,
    maxCampaigns: 3,
    photosPerDay: 100,
    historyDays: 7,
    canExport: false,
    canShareLink: true,
  },
  growth: {
    maxWorkers: 30,
    maxCampaigns: 9999,
    photosPerDay: 500,
    historyDays: 30,
    canExport: true,
    canShareLink: true,
  },
  pro: {
    maxWorkers: 999999,
    maxCampaigns: 999999,
    photosPerDay: 999999,
    historyDays: 90,
    canExport: true,
    canShareLink: true,
  },
};

export function getPlanLimits(planName: string): PlanLimits {
  return PLANS[planName] ?? PLANS.free;
}
