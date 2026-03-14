import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.js';
import * as controller from './trunks.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/test', controller.test);
router.get('/:id/status', controller.status);

export const prefix = '/trunks';
export const name = 'Trunks';
export default router;
