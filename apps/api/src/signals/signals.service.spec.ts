import { Test, type TestingModule } from '@nestjs/testing';
import { SignalsService } from './signals.service';

describe('SignalsService', () => {
  let service: SignalsService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [SignalsService],
    }).compile();

    service = moduleRef.get<SignalsService>(SignalsService);
  });

  describe('getLiveSnapshot', () => {
    it('should return a well-formed snapshot', () => {
      const snapshot = service.getLiveSnapshot();

      expect(snapshot.generatedAt).toEqual(expect.any(String));
      expect(Number.isNaN(Date.parse(snapshot.generatedAt))).toBe(false);
      expect(snapshot.healthScore).toBeGreaterThanOrEqual(0);
      expect(snapshot.healthScore).toBeLessThanOrEqual(100);
      expect(snapshot.signalsTotal).toBeGreaterThan(0);
      expect(snapshot.signalsBySource.length).toBeGreaterThan(1);
      expect(snapshot.departments.length).toBeGreaterThan(0);
      expect(snapshot.heatMap.length).toBe(48);
      expect(snapshot.heatMap.every((cell) => cell >= 0 && cell <= 1)).toBe(true);
      expect(snapshot.spark.length).toBe(3);
    });

    it('should be deterministic apart from the live tick', () => {
      const first = service.getLiveSnapshot();
      const second = service.getLiveSnapshot();

      expect(second.healthScore).toBe(first.healthScore);
      expect(second.headcount).toBe(first.headcount);
      expect(second.flightRiskPercent).toBe(first.flightRiskPercent);
      // Signal count is monotonically non-decreasing over time.
      expect(second.signalsTotal).toBeGreaterThanOrEqual(first.signalsTotal);
    });

    it('should tick the signal count up with uptime', () => {
      const before = service.getLiveSnapshot().signalsTotal;

      // Simulate ~2 minutes of elapsed uptime without real waiting.
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000);
      try {
        const after = service.getLiveSnapshot().signalsTotal;
        expect(after).toBeGreaterThan(before);
      } finally {
        jest.restoreAllMocks();
      }
    });
  });
});
