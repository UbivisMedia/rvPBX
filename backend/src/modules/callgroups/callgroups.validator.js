import Joi from 'joi';

const safeText = Joi.string().pattern(/^[^\r\n]*$/);

export const callgroupSchema = Joi.object({
  name: Joi.string().trim().pattern(/^[a-zA-Z0-9_-]+$/).required(),
  extension: Joi.string().trim().pattern(/^[0-9]{2,6}$/).required(),
  strategy: Joi.string().valid('simultaneous', 'linear', 'round-robin', 'random').default('simultaneous'),
  timeout: Joi.number().integer().min(5).max(120).default(20),
  failoverTarget: safeText.allow('', null).default(null),
  members: Joi.array().items(Joi.string().pattern(/^[0-9]{2,6}$/)).default([])
});

export const callgroupUpdateSchema = Joi.object({
  name: Joi.string().trim().pattern(/^[a-zA-Z0-9_-]+$/).optional(),
  extension: Joi.string().trim().pattern(/^[0-9]{2,6}$/).optional(),
  strategy: Joi.string().valid('simultaneous', 'linear', 'round-robin', 'random').optional(),
  timeout: Joi.number().integer().min(5).max(120).optional(),
  failoverTarget: safeText.allow('', null).optional(),
  members: Joi.array().items(Joi.string().pattern(/^[0-9]{2,6}$/)).optional()
});
