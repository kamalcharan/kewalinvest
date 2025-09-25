import Joi from 'joi';

export const contactValidationSchemas = {
  createContact: Joi.object({
    prefix: Joi.string().valid('Mr', 'Mrs', 'Ms', 'Dr', 'Prof').required(),
    name: Joi.string().min(2).max(100).required(),
    channels: Joi.array().items(
      Joi.object({
        channel_type: Joi.string().valid('email', 'mobile', 'whatsapp', 'telegram').required(),
        channel_value: Joi.string().min(1).max(255).required(),
        channel_subtype: Joi.string().max(50).optional(),
        is_primary: Joi.boolean().default(false)
      })
    ).min(1).required()
  }),

  updateContact: Joi.object({
    prefix: Joi.string().valid('Mr', 'Mrs', 'Ms', 'Dr', 'Prof').optional(),
    name: Joi.string().min(2).max(100).optional(),
    is_active: Joi.boolean().optional()
  }),

  createChannel: Joi.object({
    channel_type: Joi.string().valid('email', 'mobile', 'whatsapp', 'telegram').required(),
    channel_value: Joi.string().min(1).max(255).required(),
    channel_subtype: Joi.string().max(50).optional(),
    is_primary: Joi.boolean().default(false)
  }),

  updateChannel: Joi.object({
    channel_type: Joi.string().valid('email', 'mobile', 'whatsapp', 'telegram').optional(),
    channel_value: Joi.string().min(1).max(255).optional(),
    channel_subtype: Joi.string().max(50).optional(),
    is_primary: Joi.boolean().optional(),
    is_active: Joi.boolean().optional()
  }),

  bulkAction: Joi.object({
    contact_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    action: Joi.string().valid('activate', 'deactivate', 'delete', 'export').required()
  })
};  