import { Router } from 'express';
import * as controller from './provisioning.controller.js';

const router = Router();

router.get('/:key', controller.byKey);

export const prefix = '/provisioning';
export const name = 'Provisioning';
export default router;
