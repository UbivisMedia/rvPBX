import Joi from 'joi';

const safeText = Joi.string().pattern(/^[^\r\n]*$/);

export const endpointSchema = Joi.object({
  extension: Joi.string().trim().pattern(/^[0-9]{2,6}$/).required(),
  displayName: safeText.allow('', null).default(''),
  username: safeText.trim().required(),
  password: safeText.min(4).required(),
  codecs: Joi.array().items(Joi.string().trim()).default(['ulaw', 'alaw']),
  context: safeText.trim().default('internal'),
  template: safeText.trim().default('softphone'),
  voicemailEnabled: Joi.boolean().default(false),
  voicemailBox: Joi.string().trim().pattern(/^[0-9]{2,10}$/).allow('', null).default(null)
});

export const endpointUpdateSchema = Joi.object({
  extension: Joi.string().trim().pattern(/^[0-9]{2,6}$/).optional(),
  displayName: safeText.allow('', null).optional(),
  username: safeText.trim().optional(),
  password: safeText.min(4).optional(),
  codecs: Joi.array().items(Joi.string().trim()).optional(),
  context: safeText.trim().optional(),
  template: safeText.trim().optional(),
  voicemailEnabled: Joi.boolean().optional(),
  voicemailBox: Joi.string().trim().pattern(/^[0-9]{2,10}$/).allow('', null).optional()
});

export const endpointCsvImportSchema = Joi.object({
  rows: Joi.array()
    .items(
      Joi.object({
        extension: Joi.string().trim().pattern(/^[0-9]{2,6}$/).required(),
        displayName: safeText.allow('', null).default(''),
        username: safeText.trim().required(),
        password: safeText.min(4).required(),
        codecs: Joi.array().items(Joi.string().trim()).default(['ulaw', 'alaw']),
        context: safeText.trim().default('internal'),
        template: safeText.trim().default('softphone'),
        voicemailEnabled: Joi.boolean().default(false),
        voicemailBox: Joi.string().trim().pattern(/^[0-9]{2,10}$/).allow('', null).default(null)
      })
    )
    .min(1)
    .required()
});
