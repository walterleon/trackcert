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
exports.addOneMonth = addOneMonth;
exports.availableCredits = availableCredits;
exports.hasCredits = hasCredits;
exports.deductCredits = deductCredits;
exports.renewMonthlyCredits = renewMonthlyCredits;
exports.processDailyCredits = processDailyCredits;
exports.initializeRenewalDates = initializeRenewalDates;
const db_1 = __importDefault(require("../db"));
const plans_1 = require("../utils/plans");
/**
 * Add 1 month to a date, handling variable month lengths.
 * Jan 31 + 1 month = Feb 28 (or 29). Mar 31 + 1 month = Apr 30.
 */
function addOneMonth(date) {
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
function availableCredits(company) {
    if (company.role === 'SUPER_ADMIN')
        return Infinity;
    return company.credits + company.bonusCredits;
}
/**
 * Check if a company has credits available for visualization.
 * SUPER_ADMIN always has access.
 */
function hasCredits(company) {
    return availableCredits(company) > 0;
}
/**
 * Deduct credits for daily driver usage.
 * Deducts from monthly credits first, then from bonus credits.
 * Returns the actual amount deducted.
 */
function deductCredits(companyId, amount, reason) {
    return __awaiter(this, void 0, void 0, function* () {
        const company = yield db_1.default.company.findUnique({
            where: { id: companyId },
            select: { credits: true, bonusCredits: true, role: true },
        });
        if (!company || company.role === 'SUPER_ADMIN')
            return 0;
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
        if (totalDeducted === 0)
            return 0;
        yield db_1.default.$transaction([
            db_1.default.company.update({
                where: { id: companyId },
                data: {
                    credits: { decrement: monthlyDeduct },
                    bonusCredits: { decrement: bonusDeduct },
                },
            }),
            db_1.default.creditTransaction.create({
                data: {
                    companyId,
                    amount: -totalDeducted,
                    reason,
                },
            }),
        ]);
        return totalDeducted;
    });
}
/**
 * Renew monthly credits for a company based on their plan.
 * Resets monthly credits to plan allowance (no accumulation).
 * Sets next renewal date to +1 month.
 */
function renewMonthlyCredits(companyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const company = yield db_1.default.company.findUnique({
            where: { id: companyId },
            select: { planName: true, nextRenewalDate: true },
        });
        if (!company)
            return;
        const plan = (0, plans_1.getPlanLimits)(company.planName);
        const now = new Date();
        const nextRenewal = addOneMonth(now);
        yield db_1.default.$transaction([
            db_1.default.company.update({
                where: { id: companyId },
                data: {
                    credits: plan.monthlyCredits,
                    nextRenewalDate: nextRenewal,
                },
            }),
            db_1.default.creditTransaction.create({
                data: {
                    companyId,
                    amount: plan.monthlyCredits,
                    reason: `Renovación mensual plan ${company.planName} (${plan.monthlyCredits} créditos)`,
                },
            }),
        ]);
    });
}
/**
 * Daily credit processing: count active drivers per company, deduct credits, handle renewals.
 * An "active driver" is one who sent at least 1 location today.
 */
function processDailyCredits() {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        // 1. Handle renewals first (companies whose nextRenewalDate has passed)
        const companiesNeedingRenewal = yield db_1.default.company.findMany({
            where: {
                role: { not: 'SUPER_ADMIN' },
                nextRenewalDate: { lte: now },
            },
            select: { id: true },
        });
        let renewed = 0;
        for (const c of companiesNeedingRenewal) {
            yield renewMonthlyCredits(c.id);
            renewed++;
        }
        // 2. Count active drivers per company (drivers who sent locations today)
        const activeDriverCounts = yield db_1.default.$queryRaw `
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
                yield deductCredits(row.companyId, count, `Uso diario: ${count} driver${count > 1 ? 's' : ''} activo${count > 1 ? 's' : ''} (${todayStart.toISOString().slice(0, 10)})`);
                processed++;
            }
        }
        return { processed, renewed };
    });
}
/**
 * Initialize renewal date for companies that don't have one yet.
 * Sets it to 1 month from their creation date.
 */
function initializeRenewalDates() {
    return __awaiter(this, void 0, void 0, function* () {
        const companies = yield db_1.default.company.findMany({
            where: { nextRenewalDate: null, role: { not: 'SUPER_ADMIN' } },
            select: { id: true, createdAt: true, planName: true },
        });
        for (const c of companies) {
            const plan = (0, plans_1.getPlanLimits)(c.planName);
            const nextRenewal = addOneMonth(c.createdAt);
            yield db_1.default.company.update({
                where: { id: c.id },
                data: {
                    credits: plan.monthlyCredits,
                    nextRenewalDate: nextRenewal,
                },
            });
        }
        return companies.length;
    });
}
