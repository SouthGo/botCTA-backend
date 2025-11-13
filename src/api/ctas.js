import { Router } from 'express';
import {
  assignRolesToPostulants,
  closeCta,
  createCta,
  getCtaPostulants,
  listCtas,
  registerPostulant
} from '../db/supabase.js';

const router = Router();

router.post('/create', async (req, res) => {
  try {
    const { title, description, compo, date, createdBy, guildId } = req.body;

    if (!title || !date || !createdBy) {
      return res.status(400).json({ error: 'title, date y createdBy son requeridos' });
    }

    const result = await createCta({
      title,
      description: description || '',
      compo: compo || {},
      date,
      created_by: createdBy,
      guild_id: guildId || null
    });

    res.status(201).json({ data: result });
  } catch (error) {
    console.error('[api] Error creando CTA', error);
    res.status(500).json({ error: 'No se pudo crear la CTA' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const { status, id } = req.query;
    const result = await listCtas({ status, id });
    res.json({ data: result });
  } catch (error) {
    console.error('[api] Error listando CTAs', error);
    res.status(500).json({ error: 'No se pudo obtener la lista de CTAs' });
  }
});

router.post('/postular', async (req, res) => {
  try {
    const { ctaId, userId, userName, roles } = req.body;

    if (!ctaId || !userId || !userName) {
      return res.status(400).json({ error: 'ctaId, userId y userName son requeridos' });
    }

    const result = await registerPostulant({
      cta_id: ctaId,
      user_id: userId,
      user_name: userName,
      roles: roles || []
    });

    res.status(201).json({ data: result });
  } catch (error) {
    console.error('[api] Error registrando postulante', error);
    res.status(500).json({ error: 'No se pudo registrar la postulación' });
  }
});

router.post('/asignar', async (req, res) => {
  try {
    const { ctaId, assignments } = req.body;

    if (!ctaId || !Array.isArray(assignments)) {
      return res.status(400).json({ error: 'ctaId y assignments son requeridos' });
    }

    const result = await assignRolesToPostulants(ctaId, assignments);
    res.json({ data: result });
  } catch (error) {
    console.error('[api] Error asignando roles', error);
    res.status(500).json({ error: 'No se pudo asignar roles' });
  }
});

router.get('/:id/postulants', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getCtaPostulants(id);
    res.json({ data: result });
  } catch (error) {
    console.error('[api] Error obteniendo postulantes', error);
    res.status(500).json({ error: 'No se pudo obtener postulantes' });
  }
});

router.post('/close', async (req, res) => {
  try {
    const { ctaId } = req.body;

    if (!ctaId) {
      return res.status(400).json({ error: 'ctaId es requerido' });
    }

    const result = await closeCta(ctaId);
    res.json({ data: result });
  } catch (error) {
    console.error('[api] Error cerrando CTA', error);
    res.status(500).json({ error: 'No se pudo cerrar la CTA' });
  }
});

export default router;

