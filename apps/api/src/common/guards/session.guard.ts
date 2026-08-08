import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { type NeonAuthService } from '@app/auth/neon-auth.service';
import { IS_PUBLIC_KEY, REQUEST_USER_KEY } from '../constants/app.constants';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import type { RequestUser } from '../interfaces/request-user.interface';

/**
 * Global authentication guard.
 *
 * Validates the `Authorization: Bearer <neon-session-token>` header against
 * the Neon Auth server (via {@link NeonAuthService}) and attaches the
 * resolved principal to `request.user` for `@CurrentUser()` and the
 * `RolesGuard` to consume. Routes annotated with `@Public()` are skipped.
 *
 * Registered globally with `APP_GUARD` — every route is protected unless
 * explicitly marked public.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    protected readonly reflector: Reflector,
    private readonly neonAuth: NeonAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const principal = await this.neonAuth.validateToken(token);
    if (!principal) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    request[REQUEST_USER_KEY] = principal as RequestUser;
    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
