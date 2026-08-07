import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { AppController } from '@app/app.controller';
import { AppService } from '@app/app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().port().default(3001),
        CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
        // Required once Phase 2 introduces the Prisma data layer.
        DATABASE_URL: Joi.string().optional(),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
