import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserAwareThrottlerGuard } from '@app/common/guards/throttle.guard';
import { RbacModule } from '@app/common/services/rbac.module';
import { RolesGuard } from '@app/common/guards/roles.guard';
import { SessionGuard } from '@app/common/guards/session.guard';
import { AnalyticsModule } from '@app/analytics/analytics.module';
import { AuditModule } from '@app/audit/audit.module';
import { AppController } from '@app/app.controller';
import { AppService } from '@app/app.service';
import { AuthModule } from '@app/auth/auth.module';
import { CommonModule } from '@app/common/common.module';
import { AppConfigModule } from '@app/config/config.module';
import { DashboardModule } from '@app/dashboard/dashboard.module';
import { DatabaseModule } from '@app/database/database.module';
import { DepartmentsModule } from '@app/departments/departments.module';
import { EmployeesModule } from '@app/employees/employees.module';
import { ImportsModule } from '@app/imports/imports.module';
import { SignalsModule } from '@app/signals/signals.module';
import { TeamsModule } from '@app/teams/teams.module';
import { UsersModule } from '@app/users/users.module';

/**
 * Root application module — the composition root.
 *
 * Layered by responsibility:
 *
 * - `AppConfigModule`  → validated environment + typed configuration
 * - `CommonModule`     → global exception filter + response/logging interceptors
 * - `DatabaseModule`   → Prisma data layer
 * - `AuthModule`       → Neon Auth session bridge (validates + maps identities)
 * - `ThrottlerModule`  → global per-IP rate limiting
 * - Feature modules    → departments, teams, employees, imports, dashboard
 *
 * Global guards: `SessionGuard` authenticates every request via the Neon Auth
 * session token, then `RolesGuard` enforces `@Roles(...)` metadata. Order
 * matters — authentication runs before authorization.
 */
@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    AuthModule,
    AuditModule,
    RbacModule,
    UsersModule,
    EmployeesModule,
    DepartmentsModule,
    TeamsModule,
    ImportsModule,
    DashboardModule,
    AnalyticsModule,
    SignalsModule,
    // Global per-IP rate limiting — window/limit from env, applies to every
    // route unless annotated with @SkipThrottle().
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('rateLimit.ttlMs', 60_000),
          limit: config.get<number>('rateLimit.max', 120),
        },
      ],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard order matters: throttle first (cheap rejection — keyed by user id
    // for authenticated traffic, IP otherwise), then authentication (session),
    // then authorization (roles).
    { provide: APP_GUARD, useClass: UserAwareThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
