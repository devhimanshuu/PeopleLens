import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
}

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
