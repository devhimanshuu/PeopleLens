import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { type Observable, tap } from 'rxjs';

/**
 * Per-handler execution logging: HTTP verb, route, handler name and wall-clock
 * duration. Registered outermost so it also measures envelope wrapping.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = process.hrtime.bigint();
    const handler = context.getHandler().name;

    return next.handle().pipe(
      tap({
        error: (error: unknown) => {
          this.logger.warn(
            `${request.method} ${request.originalUrl} → ${this.errorMessage(error)} [${this.elapsedMs(
              startedAt,
            )}ms] (${handler})`,
          );
        },
        complete: () => {
          this.logger.log(
            `${request.method} ${request.originalUrl} [${this.elapsedMs(startedAt)}ms] (${handler})`,
          );
        },
      }),
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'error';
  }

  private elapsedMs(startedAt: bigint): string {
    return (Number(process.hrtime.bigint() - startedAt) / 1e6).toFixed(2);
  }
}
