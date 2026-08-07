import { Injectable } from '@nestjs/common';
import type { HealthStatus } from '@peoplelens/types';

@Injectable()
export class AppService {
  private readonly startedAt = Date.now();

  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'peoplelens-api',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
    };
  }
}
