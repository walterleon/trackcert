import prisma from '../db';
import { getPlanLimits } from '../utils/plans';

/**
 * Add 1 month to a date, handling variable month lengths.
 * Jan 31 + 1 month = Feb 28 (or 29). Mar 31 + 1 month = Apr 30.
 */
export function addOneMonth(date: Date): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setMonth(result.getMonth() + 1);
  // If the day rolled over (e.g., Jan 31 -> Mar 2/3), go back to last day of intended month
  if (result.getDate() !== originalDay) {
    result.setDate(0); // sets to last day of the previous month
  }
  return result;
}

/**
 * Get available credits for a company (monthly + bonus).
 */
export function availableCredits(company: { credits: number; bonusCredits: number; role: string }): number {
  if (company.role === 'SUPER_ADMIN') return Infinity;
  return company.credits + company.bonusCredits;
}

/**
 * Check if a company has credits available for visualization.
 * SUPER_ADMIN always has access.
 */
export function hasCredits(company: { credits: number; bonusCredits: number; role: string }): boolean {
  return availableCredits(company) > 0;
}

/**
 * Deduct credits for daily driver usage.
 * Deducts from monthly credits first, then from bonus credits.
 * Returns the actual amount deducted.
 */
export async function deductCredits(companyId: string, amount: number, reason: string): Promise<number> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { credits: true, bonusCredits: true, role: true },
  });
  if (!company || company.role === 'SUPER_ADMIN') return 0;

  let remaining = amount;
  let monthlyDeduct = 0;
  let bonusDeduct = 0;

  // Deduct from monthly credits first
  if (company.credits > 0) {
    monthlyDeduct = Math.min(company.credits, remaining);
    remaining -= monthlyDeduct;
  }
  // Then from bonus credits
  if (remaining > 0 && company.bonusCredits > 0) {
    bonusDeduct = Math.min(company.bonusCredits, remaining);
    remaining -= bonusDeduct;
  }

  const totalDeducted = monthlyDeduct + bonusDeduct;
  if (totalDeducted === 0) return 0;

  await prisma.$transaction([
    prisma.company.update({
      where: { id: companyId },
      data: {
        credits: { decrement: monthlyDeduct },
        bonusCredits: { decrement: bonusDeduct },
      },
    }),
    prisma.creditTransaction.create({
      data: {
        companyId,
        amount: -totalDeducted,
        reason,
      },
    }),
  ]);

  return totalDeducted;
}

/**
 * Renew monthly credits for a company based on their plan.
 * Resets monthly credits to plan allowance (no accumulation).
 * Sets next renewal date to +1 month.
 */
export async function renewMonthlyCredits(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { planName: true, nextRenewalDate: true },
  });
  if (!company) return;

  const plan = getPlanLimits(company.planName);
  const now = new Date();
  const nextRenewal = addOneMonth(now);

  await prisma.$transaction([
    prisma.company.update({
      where: { id: companyId },
      data: {
        credits: plan.monthlyCredits,
        nextRenewalDate: nextRenewal,
      },
    }),
    prisma.creditTransaction.create({
      data: {
        companyId,
        amount: plan.monthlyCredits,
        reason: `Renovación mensual plan ${company.planName} (${plan.monthlyCredits} créditos)`,
      },
    }),
  ]);
}

/**
 * Daily credit processing: count active drivers per company, deduct credits, handle renewals.
 * An "active driver" is one who sent at least 1 location today.
 */
export async function processDailyCredits(): Promise<{ processed: number; renewed: number }> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // 1. Handle renewals first (companies whose nextRenewalDate has passed)
  const companiesNeedingRenewal = await prisma.company.findMany({
    where: {
      role: { not: 'SUPER_ADMIN' },
      nextRenewalDate: { lte: now },
    },
    select: { id: true },
  });

  let renewed = 0;
  for (const c of companiesNeedingRenewal) {
    await renewMonthlyCredits(c.id);
    renewed++;
  }

  // 2. Count active drivers per company (drivers who sent locations today)
  const activeDriverCounts = await prisma.$queryRaw<Array<{ companyId: string; driverCount: bigint }>>`
    SELECT c.companyId, COUNT(DISTINCT l.driverId) as driverCount
    FROM Location l
    JOIN Campaign c ON l.campaignId = c.id
    JOIN Company co ON c.companyId = co.id
    WHERE l.timestamp >= ${todayStart} AND l.timestamp < ${todayEnd}
      AND co.role != 'SUPER_ADMIN'
    GROUP BY c.companyId
  `;

  let processed = 0;
  for (const row of activeDriverCounts) {
    const count = Number(row.driverCount);
    if (count > 0) {
      await deductCredits(
        row.companyId,
        count,
        `Uso diario: ${count} driver${count > 1 ? 's' : ''} activo${count > 1 ? 's' : ''} (${todayStart.toISOString().slice(0, 10)})`
      );
      processed++;
    }
  }

  return { processed, renewed };
}

/**
 * Initialize renewal date for companies that don't have one yet.
 * Sets it to 1 month from their creation date.
 */
export async function initializeRenewalDates(): Promise<number> {
  const companies = await prisma.company.findMany({
    where: { nextRenewalDate: null, role: { not: 'SUPER_ADMIN' } },
    select: { id: true, createdAt: true, planName: true },
  });

  for (const c of companies) {
    const plan = getPlanLimits(c.planName);
    const nextRenewal = addOneMonth(c.createdAt);
    await prisma.company.update({
      where: { id: c.id },
      data: {
        credits: plan.monthlyCredits,
        nextRenewalDate: nextRenewal,
      },
    });
  }

  return companies.length;
}
