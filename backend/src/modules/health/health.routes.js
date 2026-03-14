import { Router } from 'express';
import { buildHealthSnapshot } from '../../services/health.service.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, message: 'Health status', data: buildHealthSnapshot() });
});

export const prefix = '/health';
export const name = 'Health';
export default router;
