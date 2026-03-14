import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.js';
import * as controller from './endpoints.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/', controller.list);
router.post('/import/csv', controller.importCsv);
router.get('/:id', controller.details);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.get('/:id/status', controller.status);

export const prefix = '/endpoints';
export const name = 'Endpoints';
export default router;
