import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.js';
import * as controller from './dashboard.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/overview', controller.overview);
router.get('/cdr', controller.cdr);
router.get('/alerts', controller.alerts);
router.post('/alerts/:id/ack', controller.acknowledge);

export const prefix = '/dashboard';
export const name = 'Dashboard';
export default router;
