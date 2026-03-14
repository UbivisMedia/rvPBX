import Joi from 'joi';

export const restartSchema = Joi.object({
  confirm: Joi.boolean().valid(true).required()
});

export const rollbackSchema = Joi.object({
  backupName: Joi.string().required()
});

export const logsQuerySchema = Joi.object({
  lines: Joi.number().integer().min(10).max(500).default(100),
  source: Joi.string().valid('error', 'asterisk').default('asterisk')
});
