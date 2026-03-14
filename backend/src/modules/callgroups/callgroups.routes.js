import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.js';
import * as controller from './callgroups.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export const prefix = '/callgroups';
export const name = 'Callgroups';
export default router;
