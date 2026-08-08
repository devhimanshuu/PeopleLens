import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Authentication module — architecture only.
 *
 * Registers the JWT infrastructure (signing options + validation strategy) so
 * Phase 2 can add sign-in/sign-up endpoints that issue tokens. No
 * authentication endpoints exist yet. Guards are prepared in `common/guards`
 * and are not globally enforced until authenticated endpoints land.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: {
          // JWT_EXPIRES_IN is a human-readable duration (e.g. "15m") — the
          // framework typing wants ms's StringValue, so cast through the
          // exported JwtSignOptions type rather than importing ms directly.
          expiresIn: config.getOrThrow<string>(
            'jwt.expiresIn',
          ) as unknown as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
