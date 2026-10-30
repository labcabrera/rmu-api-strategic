import Joi from 'joi';

export const envSchema = Joi.object({
  PORT: Joi.number().positive().default(3002),
  LOG_LEVEL: Joi.string().default('info'),
  RMU_MONGO_STRATEGIC_URI: Joi.string().required(),
  RMU_API_CORE_URI: Joi.string().required(),
  RMU_API_ITEMS_URI: Joi.string().required(),
  RMU_API_SPELLS_URI: Joi.string().required(),
  // Workspace spec 055: the NPCs of the factions are checked against rmu-api-npcs.
  RMU_API_NPCS_URI: Joi.string().required(),
  RMU_IAM_URI: Joi.string().uri().default('http://localhost/sso'),
  RMU_IAM_REALM: Joi.string().default('rmu'),
  RMU_IAM_JWK_URI: Joi.string().uri().required(),
  RMU_IAM_ISSUER_URI: Joi.string().uri().required(),
  RMU_IAM_AUDIENCE: Joi.string().required(),
  // The service token used to call core, items, spells and npcs (TokenService, client credentials).
  RMU_IAM_TOKEN_URI: Joi.string().uri().required(),
  RMU_IAM_CLIENT_ID: Joi.string().required(),
  RMU_IAM_CLIENT_SECRET: Joi.string().required(),
  // Timeout of each call to another API (HttpClient): no answer in time is a 504 upstream-timeout.
  RMU_HTTP_TIMEOUT_MS: Joi.number().integer().min(1).default(10_000),
  RMU_KAFKA_BROKERS: Joi.string().required(),
  RMU_KAFKA_CLIENT_ID: Joi.string().required(),
  RMU_KAFKA_CONSUMER_GROUP_ID: Joi.string().required(),
  RMU_KAFKA_DEFAULT_PARTITIONS: Joi.number().integer().min(1).default(1),
  // HTTP hardening, as in rmu-api-core. No origins: CORS stays off, as the browser comes through the gateway.
  RMU_CORS_ORIGINS: Joi.string().allow('').default(''),
  RMU_THROTTLE_LIMIT: Joi.number().integer().min(0).default(300),
  RMU_THROTTLE_TTL_MS: Joi.number().integer().min(1).default(60_000),
  // House rules of the economy (workspace spec 023): Core Law does not fix them, and each request can override them.
  RMU_STRATEGIC_SALE_PERCENT: Joi.number().min(0).max(1000).default(50),
  RMU_STRATEGIC_MATERIALS_PERCENT: Joi.number().min(0).max(1000).default(50),
  RMU_STRATEGIC_CONDITION_PERCENTS: Joi.string()
    .pattern(/^\d+(\.\d+)?,\d+(\.\d+)?,\d+(\.\d+)?$/)
    .default('100,50,10'),
  // Body limit of the import routes (workspace spec 024): an export file of a whole faction. The other routes keep 100 KB.
  RMU_STRATEGIC_IMPORT_MAX_BYTES: Joi.number()
    .integer()
    .min(1024)
    .default(5 * 1024 * 1024),
  RMU_TRUST_PROXY: Joi.string().default('loopback, linklocal, uniquelocal'),
});
