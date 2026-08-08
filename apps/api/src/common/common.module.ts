import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './exceptions/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { ResponseInterceptor } from './interceptors/response.interceptor';

/**
 * Registers the platform-wide cross-cutting infrastructure:
 *
 * - `GlobalExceptionFilter` → standard `{success, message, data, timestamp}` error envelope
 * - `LoggingInterceptor`    → per-handler execution timing
 * - `ResponseInterceptor`   → standard success envelope
 *
 * The JWT/Roles guards live in `common/guards` and are intentionally NOT
 * registered globally — they are wired per-controller (or globally via
 * `APP_GUARD`) once Phase 2 introduces authenticated endpoints.
 */
@Module({
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class CommonModule {}
