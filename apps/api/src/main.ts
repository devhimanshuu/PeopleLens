import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);
  const environment = config.get<string>('NODE_ENV', 'development');

  // Explicit origin allowlist, never a reflected wildcard, since credentials
  // are allowed. Comma-separated: CORS_ORIGINS=http://localhost:3000,https://app.example.com
  const corsOrigins = (config.get<string>('CORS_ORIGINS', 'http://localhost:3000') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  await app.listen(port);
  Logger.log(
    `PeopleLens API listening on http://localhost:${port}/api (${environment})`,
    'Bootstrap',
  );
}

void bootstrap();
