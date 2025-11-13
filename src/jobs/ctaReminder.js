import cron from 'node-cron';
import {
  findCtasStartingIn,
  markNotificationSent,
  wasNotificationSent
} from '../db/supabase.js';
import { getBotBridge } from '../bot/discordClient.js';

const CRON_EXPRESSION = '* * * * *';

export function scheduleCtaReminderJob() {
  cron.schedule(CRON_EXPRESSION, async () => {
    try {
      const ctas = await findCtasStartingIn(30);
      const bot = getBotBridge();

      for (const cta of ctas) {
        const alreadyNotified = await wasNotificationSent(cta.id);
        if (alreadyNotified) continue;

        await bot.notifyOfficials(cta.id, { cta });
        await markNotificationSent(cta.id);
      }
    } catch (error) {
      console.error('[cron] Error en job de recordatorio CTA', error);
    }
  });

  console.log('[cron] Job de recordatorio CTA programado cada minuto');
}

