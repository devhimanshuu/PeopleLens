import { type ExecutionContext, Injectable } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, JWT_STRATEGY_NAME } from '../constants/app.constants';

/**
 * JWT authentication guard.
 *
 * Validates the `Authorization: Bearer <token>` header against the JWT
 * strategy. Routes annotated with `@Public()` skip authentication entirely.
 *
 * Register per-controller (`@UseGuards(JwtAuthGuard)`) or globally via the
 * `APP_GUARD` provider — the global wiring is intentionally deferred until
 * Phase 2 introduces authenticated endpoints.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;
    return (await super.canActivate(context)) as boolean;
  }
}
