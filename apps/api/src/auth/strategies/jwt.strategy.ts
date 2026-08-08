import { Injectable } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_STRATEGY_NAME } from '../../common/constants/app.constants';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Validates `Authorization: Bearer <token>` headers.
 *
 * `validate` runs after Passport has verified the token signature and
 * expiration; its return value becomes `request.user`, which is what
 * `@CurrentUser()` and the `RolesGuard` consume.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY_NAME) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
