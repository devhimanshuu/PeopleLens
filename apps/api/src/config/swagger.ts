import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { API_GLOBAL_PREFIX } from '../common/constants/app.constants';

const logger = new Logger('Swagger');

/**
 * Bootstraps OpenAPI documentation for the API.
 *
 * Served at `{SWAGGER_PATH}` under the global prefix (default
 * `/api/v1/docs`) so the docs live next to the versioned API. Bearer auth is
 * pre-configured for the JWT guards prepared in the auth module.
 */
export function setupSwagger(app: INestApplication): void {
  const config = app.get(ConfigService);

  const documentConfig = new DocumentBuilder()
    .setTitle('PeopleLens API')
    .setDescription('Enterprise Workforce Intelligence Platform — REST API')
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste your access token',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  const path = config.get<string>('swagger.path', 'docs');

  SwaggerModule.setup(path, app, document, { useGlobalPrefix: true });

  logger.log(`Swagger UI available at /${API_GLOBAL_PREFIX}/${path}`);
}
