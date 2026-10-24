import Joi from 'joi';

export const envSchema = Joi.object({
  PORT: Joi.number().positive().default(3002),
  LOG_LEVEL: Joi.string().default('info'),
  RMU_MONGO_STRATEGIC_URI: Joi.string().required(),
  RMU_API_CORE_URI: Joi.string().required(),
  RMU_API_ITEMS_URI: Joi.string().required(),
  RMU_IAM_URI: Joi.string().uri().default('http://localhost/sso'),
  RMU_IAM_REALM: Joi.string().default('rmu'),
  RMU_IAM_JWK_URI: Joi.string().uri().required(),
  RMU_IAM_ISSUER_URI: Joi.string().uri().required(),
  RMU_IAM_AUDIENCE: Joi.string().required(),
  // The service token used to call core and items (TokenService, client credentials).
  RMU_IAM_TOKEN_URI: Joi.string().uri().required(),
  RMU_IAM_CLIENT_ID: Joi.string().required(),
  RMU_IAM_CLIENT_SECRET: Joi.string().required(),
  RMU_KAFKA_BROKERS: Joi.string().required(),
  RMU_KAFKA_CLIENT_ID: Joi.string().required(),
  RMU_KAFKA_CONSUMER_GROUP_ID: Joi.string().required(),
  RMU_KAFKA_DEFAULT_PARTITIONS: Joi.number().integer().min(1).default(1),
});
