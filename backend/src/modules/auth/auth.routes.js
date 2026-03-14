import { Router } from 'express';
import { authRateLimiter } from '../../core/middleware/rate-limiter.js';
import * as controller from './auth.controller.js';

const router = Router();

router.post('/login', authRateLimiter, controller.login);
router.post('/refresh', controller.refresh);

export const prefix = '/auth';
export const name = 'Auth';
export default router;
