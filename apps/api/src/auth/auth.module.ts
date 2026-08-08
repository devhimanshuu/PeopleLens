import { Global, Module } from '@nestjs/common';
import { NeonAuthService } from './neon-auth.service';

/**
 * Authentication bridge.
 *
 * Sign-in/sign-up/refresh are owned by Neon Auth (Managed Better Auth) on the
 * web app. This module exposes {@link NeonAuthService}, which validates Neon
 * session tokens server-side and maps the confirmed identity to a local
 * `User` row (the source of truth for RBAC roles). The global `SessionGuard`
 * consumes it on every request.
 */
@Global()
@Module({
  providers: [NeonAuthService],
  exports: [NeonAuthService],
})
export class AuthModule {}
