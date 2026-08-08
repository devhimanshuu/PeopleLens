import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './exceptions/global-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';

/**
 * Registers the platform-wide cross-cutting infrastructure:
 *
 * - `GlobalExceptionFilter` → standard `{success, message, data, timestamp}` error envelope
 * - `ResponseInterceptor`   → standard success envelope
 *
 * Per-request observability lives in the Express middleware registered in
 * `main.ts` (request-id + one-line request logging); the interceptor was
 * removed to avoid logging every request twice.
 *
 * Guards (throttle/session/roles) are registered globally in `AppModule` via
 * `APP_GUARD` — authentication before authorization, rate limiting first.
 */
@Module({
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class CommonModule {}
