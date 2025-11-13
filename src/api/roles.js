import { Router } from 'express';

const router = Router();

const AVAILABLE_ROLES = [
  { id: 'tank', label: 'Tank' },
  { id: 'healer', label: 'Healer' },
  { id: 'dps_melee', label: 'DPS Melee' },
  { id: 'dps_ranged', label: 'DPS Ranged' },
  { id: 'support', label: 'Support' },
  { id: 'scout', label: 'Scout' }
];

router.get('/available', (_req, res) => {
  res.json({ data: AVAILABLE_ROLES });
});

export default router;

