import { Injectable, Logger } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import { type PrismaService } from '@app/database/prisma.service';
import type { Role } from '@app/common/enums/role.enum';

/** Session cache entry: the principal we attach to the request. */
interface CachedPrincipal {
  sub: string;
  email: string;
  roles: Role[];
  expiresAt: number;
}

/** Identity returned by the Neon Auth `get-session` endpoint. */
interface NeonSessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

/**
 * Bridges Neon Auth (Managed Better Auth) sessions into PeopleLens RBAC.
 *
 * The web app owns sign-in/sign-up via Neon Auth and sends the resulting
 * session token as `Authorization: Bearer <token>`. This service validates the
 * token against the managed auth server's `get-session` endpoint, then maps
 * the confirmed identity (by email) to a local `User` row — the source of
 * truth for the platform role (admin / manager / viewer).
 *
 * First-contact bootstrap: the very first account to be validated becomes an
 * `admin` so a fresh deployment is immediately usable; every later sign-up is
 * `viewer` until an admin promotes them (see UsersModule). No users are
 * seeded — identities come exclusively from Neon Auth sign-ins.
 */
@Injectable()
export class NeonAuthService {
  private readonly logger = new Logger(NeonAuthService.name);
  private readonly cache = new Map<string, CachedPrincipal>();
  private readonly cacheTtlMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.cacheTtlMs = this.config.get<number>('auth.sessionCacheTtlMs', 60_000);
  }

  /**
   * Validates a Neon session token and returns the principal to attach to
   * `request.user`, or `null` when the token is missing/invalid/expired.
   */
  async validateToken(token: string): Promise<CachedPrincipal | null> {
    const cached = this.cache.get(token);
    if (cached && cached.expiresAt > Date.now()) return cached;

    try {
      const user = await this.fetchSessionUser(token);
      if (!user) return null;

      const localUser = await this.syncLocalUser(user);
      if (!localUser?.isActive) return null;

      const principal: CachedPrincipal = {
        sub: localUser.id,
        email: localUser.email,
        roles: [localUser.role as Role],
        expiresAt: Date.now() + this.cacheTtlMs,
      };
      this.cache.set(token, principal);
      return principal;
    } catch (error) {
      this.logger.warn(
        `Neon session validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /** Clears the cached principal for a token (used on sign-out revocation). */
  invalidate(token: string): void {
    this.cache.delete(token);
  }

  /** Calls the managed auth server to confirm the session token. */
  private async fetchSessionUser(token: string): Promise<NeonSessionUser | null> {
    const baseUrl = this.config.getOrThrow<string>('auth.neonBaseUrl');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${baseUrl}/get-session`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) return null;
      const payload = (await response.json()) as {
        session?: unknown;
        user?: NeonSessionUser | null;
      } | null;

      // The auth server returns `null` when the token is invalid/expired.
      if (!payload?.user) return null;
      return payload.user;
    } catch (error) {
      this.logger.warn(
        `Neon Auth unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Finds (or provisions) the local User for the confirmed Neon identity. */
  private async syncLocalUser(neonUser: NeonSessionUser): Promise<User | null> {
    let user = await this.prisma.user.findUnique({ where: { email: neonUser.email } });

    if (!user) {
      const isFirstAccount = (await this.prisma.user.count()) === 0;
      try {
        user = await this.prisma.user.create({
          data: {
            email: neonUser.email,
            name: neonUser.name?.trim() || neonUser.email.split('@')[0] || 'User',
            // First account boots as admin so a fresh deployment is usable.
            role: isFirstAccount ? 'admin' : 'viewer',
          },
        });
        this.logger.log(
          `Provisioned local user ${user.email} with role ${user.role}${isFirstAccount ? ' (first account → admin)' : ''}`,
        );
      } catch (error) {
        // Unique-email race: another request provisioned it first.
        if (this.isUniqueViolation(error)) {
          user = await this.prisma.user.findUnique({ where: { email: neonUser.email } });
        } else {
          throw error;
        }
      }
    }

    return user;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
