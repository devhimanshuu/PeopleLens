import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import configureServerlessExpress from '@codegenie/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { API_GLOBAL_PREFIX } from './common/constants/app.constants';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { requestLoggerMiddleware } from './common/middleware/request-logger.middleware';

let cachedServer: Handler;

async function bootstrapServer(): Promise<Handler> {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.use(requestIdMiddleware());
  app.use(requestLoggerMiddleware(config));

  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableCors({
    origin: config.get<string[]>('corsOrigins', ['http://localhost:3000']),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();

  return configureServerlessExpress({ app: expressApp });
}

export const handler: Handler = async (event: unknown, context: Context, callback: Callback) => {
  if (!cachedServer) {
    try {
      cachedServer = await bootstrapServer();
    } catch (err) {
      console.error('Error bootstrapping NestJS server:', err);
      throw err;
    }
  }
  return cachedServer(event, context, callback);
};
