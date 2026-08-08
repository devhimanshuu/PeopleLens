import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { API_GLOBAL_PREFIX } from './common/constants/app.constants';
import { requestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { isProduction } from './common/utils/env.util';
import { setupSwagger } from './config/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Security & transport hardening. Helmet sets sane HTTP security headers;
  // compression shrinks JSON payloads for the analytics-heavy API.
  app.use(helmet());
  app.use(compression());

  // One-line request log (method, route, status, duration) — config-gated.
  app.use(requestLoggerMiddleware(config));

  // Versioned API namespace: every route lives under /api/v1.
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableShutdownHooks();

  // Explicit origin allowlist — never a reflected wildcard, since credentials
  // are allowed. Comma-separated: CORS_ORIGINS=http://localhost:3000,https://app.example.com
  app.enableCors({
    origin: config.get<string[]>('corsOrigins', ['http://localhost:3000']),
    credentials: true,
  });

  // Request contract validation. DTOs arrive with Phase 2; the pipe is wired
  // globally now so every future endpoint enforces its contract by default.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Developer tooling — disabled in production unless explicitly enabled.
  if (config.get<boolean>('swagger.enabled', true)) {
    setupSwagger(app);
  }

  const port = config.get<number>('port', 3001);
  const environment = config.get<string>('env', 'development');

  await app.listen(port);
  Logger.log(
    `PeopleLens API listening on http://localhost:${port}/${API_GLOBAL_PREFIX} (${environment}${
      isProduction(environment) ? ', production' : ''
    })`,
    'Bootstrap',
  );
}

void bootstrap();
