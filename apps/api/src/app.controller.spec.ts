import { Test, type TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should report a healthy status', () => {
      const health = appController.getHealth();

      expect(health.status).toBe('ok');
      expect(health.service).toBe('peoplelens-api');
      expect(typeof health.timestamp).toBe('string');
      expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });
});
