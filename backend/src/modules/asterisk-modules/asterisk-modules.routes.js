import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.js';
import * as controller from './asterisk-modules.controller.js';

const router = Router();

router.use(authMiddleware);

// GET  /asterisk-modules?filter=<keyword>  – list all (or filtered) Asterisk modules
router.get('/', controller.list);

// POST /asterisk-modules/:name/reload  – reload a running module
router.post('/:name/reload', controller.reload);

// POST /asterisk-modules/:name/load    – load a module
router.post('/:name/load', controller.load);

// DELETE /asterisk-modules/:name       – unload a module
router.delete('/:name', controller.unload);

export const prefix = '/asterisk-modules';
export const name = 'AsteriskModules';
export default router;
