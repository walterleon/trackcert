import { processDailyCredits, initializeRenewalDates } from '../services/creditService';

let lastRunDate = '';

/**
 * Start the credit cron job.
 * Checks every hour; runs daily processing once per day after 2:00 AM.
 * Also initializes renewal dates for companies that don't have one.
 */
export async function startCreditCron(): Promise<void> {
  // On startup: initialize renewal dates for any companies missing them
  try {
    const initialized = await initializeRenewalDates();
    if (initialized > 0) {
      console.log(`[credit-cron] Initialized renewal dates for ${initialized} companies`);
    }
  } catch (err) {
    console.error('[credit-cron] Error initializing renewal dates:', err);
  }

  // Check every hour if daily processing is needed
  setInterval(async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hour = now.getHours();

    // Run after 2 AM, once per day
    if (hour >= 2 && lastRunDate !== today) {
      lastRunDate = today;
      try {
        const result = await processDailyCredits();
        console.log(`[credit-cron] Daily processing: ${result.processed} companies charged, ${result.renewed} renewals`);
      } catch (err) {
        console.error('[credit-cron] Error in daily processing:', err);
        // Reset so it retries next hour
        lastRunDate = '';
      }
    }
  }, 60 * 60 * 1000); // every hour

  console.log('[credit-cron] Credit cron started (hourly check, daily execution after 2 AM)');
}
