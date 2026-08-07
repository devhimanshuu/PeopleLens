import { Test, type TestingModule } from '@nestjs/testing';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';

describe('SignalsController', () => {
  let controller: SignalsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SignalsController],
      providers: [SignalsService],
    }).compile();

    controller = moduleRef.get<SignalsController>(SignalsController);
  });

  describe('getLive', () => {
    it('should return a live signals snapshot', () => {
      const snapshot = controller.getLive();

      expect(snapshot.signalsTotal).toBeGreaterThan(0);
      expect(snapshot.healthScore).toBeGreaterThan(0);
      expect(snapshot.healthScore).toBeLessThanOrEqual(100);
      expect(Number.isNaN(Date.parse(snapshot.generatedAt))).toBe(false);
    });
  });
});
