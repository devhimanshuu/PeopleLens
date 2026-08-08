import { isProduction, type NodeEnv } from '../common/utils/env.util';

/** Typed view of the runtime configuration produced by the load factory. */
export interface AppConfig {
  env: NodeEnv;
  port: number;
  /** Comma-separated `CORS_ORIGINS` parsed into an explicit allowlist. */
  corsOrigins: string[];
  databaseUrl: string;
  auth: {
    /** Base URL of the Neon Auth (Managed Better Auth) server. */
    neonBaseUrl: string;
    /** How long a validated session stays cached in-memory (ms). */
    sessionCacheTtlMs: number;
  };
  /** Global rate limiting — keyed by user id when authenticated, IP otherwise. */
  rateLimit: {
    /** Window length in ms. */
    ttlMs: number;
    /** Maximum requests per key per window. */
    max: number;
  };
  /** Trust X-Forwarded-For from loopback proxies (behind a reverse proxy). */
  trustProxy: boolean;
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
  auth: {
    neonBaseUrl: process.env.NEON_AUTH_BASE_URL ?? '',
    sessionCacheTtlMs: Number.parseInt(process.env.SESSION_CACHE_TTL_MS ?? '60000', 10),
  },
  rateLimit: {
    ttlMs: Number.parseInt(process.env.RATE_LIMIT_TTL_MS ?? '60000', 10),
    max: Number.parseInt(process.env.RATE_LIMIT_MAX ?? '120', 10),
  },
  trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
  swagger: {
    // Same truthy/falsy semantics as the Joi schema so the factory and the
    // validated contract can never disagree ('0' and 'false' are both off).
    // Off by default in production — docs must be an explicit opt-in.
    enabled: parseBoolean(process.env.SWAGGER_ENABLED, !isProduction(process.env.NODE_ENV)),
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
