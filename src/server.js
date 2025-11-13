import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import ctaRouter from './api/ctas.js';
import postulantRouter from './api/postulants.js';
import rolesRouter from './api/roles.js';
import { initializeBot } from './bot/discordClient.js';
import { scheduleCtaReminderJob } from './jobs/ctaReminder.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/cta', ctaRouter);
app.use('/postulants', postulantRouter);
app.use('/roles', rolesRouter);

const port = process.env.PORT || 4000;

const server = app.listen(port, () => {
  console.log(`[server] API escuchando en puerto ${port}`);
});

initializeBot().catch((error) => {
  console.error('[bot] Error al inicializar el bot de Discord:', error);
});

scheduleCtaReminderJob();

export default server;

