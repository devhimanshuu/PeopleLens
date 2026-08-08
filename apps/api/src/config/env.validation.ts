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

  // Auth bridge — validates Neon Auth sessions from the API side.
  // Required in production (the API would otherwise reject every protected
  // route); optional in dev where the API boots fail-closed until configured.
  NEON_AUTH_BASE_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required().description('Neon Auth base URL — required in production'),
    otherwise: Joi.string().allow('').default(''),
  }),
  SESSION_CACHE_TTL_MS: Joi.number().integer().positive().default(60000),

  // Comma-separated emails granted the Admin role at first contact and
  // re-promoted on every session (bootstrap admins).
  ADMIN_EMAILS: Joi.string().allow('').default(''),

  // Global rate limiting (per user when authenticated, per IP otherwise).
  RATE_LIMIT_TTL_MS: Joi.number().integer().positive().default(60000),
  RATE_LIMIT_MAX: Joi.number().integer().positive().default(120),

  // Set to true when the API runs behind a trusted reverse proxy so
  // X-Forwarded-For from loopback proxies is honored for rate limiting.
  TRUST_PROXY: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false),

  // Developer tooling.
  SWAGGER_ENABLED: Joi.boolean().truthy('true', '1').falsy('false', '0').default(true),
  SWAGGER_PATH: Joi.string().default('docs'),
  REQUEST_LOGGING_ENABLED: Joi.boolean().truthy('true', '1').falsy('false', '0').default(true),
});
