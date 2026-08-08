import Joi from 'joi';

/**
 * Validated environment contract for the API.
 *
 * Fails fast at boot with a precise message when a required variable is
 * missing or malformed — misconfiguration should never surface at runtime.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3001),

  // Comma-separated allowlist of origins allowed to call the API with credentials.
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // PostgreSQL connection string consumed by Prisma.
  DATABASE_URL: Joi.string()
    .required()
    .description('PostgreSQL connection string consumed by Prisma'),

  // JWT signing (auth endpoints land in Phase 2; the strategy is validated now).
  JWT_SECRET: Joi.string().min(16).default('peoplelens-local-dev-secret-change-me'),
  JWT_EXPIRES_IN: Joi.string().default('15m'),

  // Developer tooling.
  SWAGGER_ENABLED: Joi.boolean().truthy('true', '1').falsy('false', '0').default(true),
  SWAGGER_PATH: Joi.string().default('docs'),
  REQUEST_LOGGING_ENABLED: Joi.boolean().truthy('true', '1').falsy('false', '0').default(true),
});
