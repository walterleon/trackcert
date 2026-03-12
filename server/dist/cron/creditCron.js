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
exports.startCreditCron = startCreditCron;
const creditService_1 = require("../services/creditService");
let lastRunDate = '';
/**
 * Start the credit cron job.
 * Checks every hour; runs daily processing once per day after 2:00 AM.
 * Also initializes renewal dates for companies that don't have one.
 */
function startCreditCron() {
    return __awaiter(this, void 0, void 0, function* () {
        // On startup: initialize renewal dates for any companies missing them
        try {
            const initialized = yield (0, creditService_1.initializeRenewalDates)();
            if (initialized > 0) {
                console.log(`[credit-cron] Initialized renewal dates for ${initialized} companies`);
            }
        }
        catch (err) {
            console.error('[credit-cron] Error initializing renewal dates:', err);
        }
        // Check every hour if daily processing is needed
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const today = now.toISOString().slice(0, 10);
            const hour = now.getHours();
            // Run after 2 AM, once per day
            if (hour >= 2 && lastRunDate !== today) {
                lastRunDate = today;
                try {
                    const result = yield (0, creditService_1.processDailyCredits)();
                    console.log(`[credit-cron] Daily processing: ${result.processed} companies charged, ${result.renewed} renewals`);
                }
                catch (err) {
                    console.error('[credit-cron] Error in daily processing:', err);
                    // Reset so it retries next hour
                    lastRunDate = '';
                }
            }
        }), 60 * 60 * 1000); // every hour
        console.log('[credit-cron] Credit cron started (hourly check, daily execution after 2 AM)');
    });
}
