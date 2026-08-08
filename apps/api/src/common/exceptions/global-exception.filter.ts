import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorResponse } from '@peoplelens/types';
import type { Request, Response } from 'express';

/**
 * Last-resort error boundary for HTTP requests.
 *
 * Normalizes every thrown error — `HttpException`, DTO validation failures or
 * unexpected runtime errors — into the standard error envelope and logs it
 * with the appropriate severity (warn for 4xx, error for 5xx).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;

    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();

    // Never attempt to write a body once the response has started streaming.
    if (response.headersSent) throw exception;

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = this.toErrorResponse(exception, status, request.originalUrl);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.originalUrl} → ${status} ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.originalUrl} → ${status} ${body.message}`);
    }

    response.status(status).json(body);
  }

  private toErrorResponse(exception: unknown, status: number, path: string): ApiErrorResponse {
    const base = {
      success: false as const,
      data: null,
      timestamp: new Date().toISOString(),
      path,
    };

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const { message, error, details } = this.extractHttpError(payload, exception.message, status);
      return { ...base, statusCode: status, message, error, details };
    }

    return {
      ...base,
      statusCode: status,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  private extractHttpError(
    payload: string | object,
    fallbackMessage: string,
    status: number,
  ): { message: string; error: string; details?: unknown } {
    if (typeof payload === 'string') {
      return { message: payload, error: this.httpStatusName(status) };
    }

    const record = payload as Record<string, unknown>;
    const rawMessage = record.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : fallbackMessage;
    const error = typeof record.error === 'string' ? record.error : this.httpStatusName(status);

    return {
      message,
      error,
      // Validation errors carry a message array — surface it as machine-readable detail.
      details: Array.isArray(rawMessage) ? rawMessage : undefined,
    };
  }

  private httpStatusName(status: number): string {
    const reverse = HttpStatus as unknown as Record<number, string>;
    return reverse[status] ?? `HTTP_${status}`;
  }
}
