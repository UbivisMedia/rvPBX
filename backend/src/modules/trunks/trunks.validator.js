import Joi from 'joi';

const safeText = Joi.string().pattern(/^[^\r\n]*$/);

export const trunkSchema = Joi.object({
  name: Joi.string().trim().pattern(/^[a-zA-Z0-9_-]+$/).required(),
  host: Joi.string().trim().hostname().required(),
  username: safeText.allow('', null).default(''),
  password: safeText.allow('', null).default(''),
  transport: Joi.string().valid('udp', 'tcp', 'tls', 'ws', 'wss').default('udp'),
  context: safeText.trim().default('from-trunk'),
  registerEnabled: Joi.boolean().default(true)
});

export const trunkUpdateSchema = Joi.object({
  name: Joi.string().trim().pattern(/^[a-zA-Z0-9_-]+$/).optional(),
  host: Joi.string().trim().hostname().optional(),
  username: safeText.allow('', null).optional(),
  password: safeText.allow('', null).optional(),
  transport: Joi.string().valid('udp', 'tcp', 'tls', 'ws', 'wss').optional(),
  context: safeText.trim().optional(),
  registerEnabled: Joi.boolean().optional()
});
