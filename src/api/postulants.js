import { Router } from 'express';
import { getPostulantHistory, removePostulant } from '../db/supabase.js';

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

router.delete('/leave', async (req, res) => {
  try {
    const { ctaId, userId } = req.body;

    if (!ctaId || !userId) {
      return res.status(400).json({ error: 'ctaId y userId son requeridos' });
    }

    const result = await removePostulant(ctaId, userId);
    res.json({ data: result });
  } catch (error) {
    console.error('[api] Error eliminando postulante', error);
    res.status(500).json({ error: 'No se pudo eliminar la postulación' });
  }
});

export default router;

