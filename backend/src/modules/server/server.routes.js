import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.js';
import * as controller from './server.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/status', controller.status);
router.post('/reload', controller.reload);
router.post('/restart', controller.restart);
router.post('/api-restart', controller.apiRestart);
router.get('/backups', controller.backups);
router.post('/rollback', controller.rollback);
router.get('/logs', controller.logs);
router.get('/activity', controller.activity);

export const prefix = '/server';
export const name = 'Server';
export default router;
