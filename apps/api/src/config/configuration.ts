import type { NodeEnv } from '../common/utils/env.util';

/** Typed view of the runtime configuration produced by the load factory. */
export interface AppConfig {
  env: NodeEnv;
  port: number;
  /** Comma-separated `CORS_ORIGINS` parsed into an explicit allowlist. */
  corsOrigins: string[];
  databaseUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  swagger: {
    enabled: boolean;
    path: string;
  };
  requestLogging: {
    enabled: boolean;
  };
}

/**
 * Loads a typed configuration object once at bootstrap. Values come from the
 * environment (already validated by `env.validation.ts`); `ConfigService`
 * then exposes them type-safely via `config.get('jwt.secret')`.
 */
export default (): AppConfig => ({
  env: (process.env.NODE_ENV as NodeEnv | undefined) ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3001', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'peoplelens-local-dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
  swagger: {
    // Same truthy/falsy semantics as the Joi schema so the factory and the
    // validated contract can never disagree ('0' and 'false' are both off).
    enabled: parseBoolean(process.env.SWAGGER_ENABLED, true),
    path: process.env.SWAGGER_PATH ?? 'docs',
  },
  requestLogging: {
    enabled: parseBoolean(process.env.REQUEST_LOGGING_ENABLED, true),
  },
});

/** Mirrors `env.validation.ts`'s Joi boolean coercion for load-factory use. */
function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return fallback;
}
