import { Router } from 'express';
import { getPostulantHistory } from '../db/supabase.js';

const router = Router();

router.get('/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await getPostulantHistory(userId);
    res.json({ data: history });
  } catch (error) {
    console.error('[api] Error obteniendo historial de postulaciones', error);
    res.status(500).json({ error: 'No se pudo obtener el historial del postulante' });
  }
});

export default router;

