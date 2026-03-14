import Joi from 'joi';

export const cdrQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(90).default(7)
});

export const alertsQuerySchema = Joi.object({
  status: Joi.string().valid('open', 'acknowledged', 'all').default('open'),
  limit: Joi.number().integer().min(1).max(500).default(100)
});
