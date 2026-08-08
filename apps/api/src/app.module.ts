import { Module } from '@nestjs/common';
import { AnalyticsModule } from '@app/analytics/analytics.module';
import { AppController } from '@app/app.controller';
import { AppService } from '@app/app.service';
import { AuthModule } from '@app/auth/auth.module';
import { CommonModule } from '@app/common/common.module';
import { AppConfigModule } from '@app/config/config.module';
import { DashboardModule } from '@app/dashboard/dashboard.module';
import { DatabaseModule } from '@app/database/database.module';
import { DepartmentsModule } from '@app/departments/departments.module';
import { EmployeesModule } from '@app/employees/employees.module';
import { SignalsModule } from '@app/signals/signals.module';
import { UsersModule } from '@app/users/users.module';

/**
 * Root application module — the composition root.
 *
 * Layered by responsibility:
 *
 * - `AppConfigModule`  → validated environment + typed configuration
 * - `CommonModule`     → global exception filter + response/logging interceptors
 * - `DatabaseModule`   → Prisma data layer
 * - `AuthModule`       → JWT infrastructure (no endpoints yet)
 * - Feature modules    → registered as skeletons; the graph stays stable as
 *                        business logic lands in Phase 2
 */
@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
    DepartmentsModule,
    DashboardModule,
    AnalyticsModule,
    SignalsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
