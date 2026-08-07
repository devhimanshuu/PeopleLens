import { Injectable } from '@nestjs/common';
import type { LiveSignalsSnapshot } from '@peoplelens/types';

/**
 * Baseline "live" workforce signals. Deterministic — no DB dependency yet
 * (Phase 2 swaps this for the Prisma data layer) — but carries real
 * timestamps and a slowly ticking signal count so the landing dashboard
 * reads as genuinely live.
 */
/** How far back the "model refreshed" timestamp should sit. */
const MODEL_REFRESH_MINUTES = 4;

const BASELINE = {
  healthScore: 87,
  healthDelta: 4.2,
  headcount: 12847,
  engagementPercent: 78,
  flightRiskPercent: 4.2,
  signalsBySource: [
    { source: 'Workday', count: 412 },
    { source: 'BambooHR', count: 288 },
    { source: 'Greenhouse', count: 214 },
    { source: 'Slack', count: 197 },
    { source: 'Performance', count: 103 },
    { source: 'Payroll', count: 70 },
  ],
  departments: [
    { name: 'Engineering', pct: 86, tone: 'indigo' as const },
    { name: 'Sales', pct: 72, tone: 'cyan' as const },
    { name: 'Operations', pct: 64, tone: 'emerald' as const },
    { name: 'Customer Success', pct: 58, tone: 'violet' as const },
  ],
  heatMap: [
    0.1, 0.08, 0.12, 0.15, 0.09, 0.11, 0.14, 0.07, 0.1, 0.13, 0.09, 0.08, 0.16, 0.12, 0.2, 0.28,
    0.18, 0.14, 0.22, 0.17, 0.12, 0.15, 0.19, 0.13, 0.3, 0.24, 0.34, 0.42, 0.28, 0.22, 0.36, 0.26,
    0.18, 0.24, 0.31, 0.21, 0.45, 0.36, 0.5, 0.58, 0.4, 0.34, 0.52, 0.38, 0.3, 0.4, 0.48, 0.35,
  ],
  spark: [
    {
      label: 'Headcount',
      value: 12847,
      suffix: '',
      decimals: 0,
      data: [40, 42, 41, 45, 47, 49, 48, 51],
    },
    {
      label: 'Engagement',
      value: 78,
      suffix: '%',
      decimals: 0,
      data: [60, 63, 61, 66, 68, 70, 72, 78],
    },
    {
      label: 'Flight risk',
      value: 4.2,
      suffix: '%',
      decimals: 1,
      data: [7, 6.4, 6.8, 5.9, 5.4, 5, 4.6, 4.2],
    },
  ],
} satisfies Omit<
  LiveSignalsSnapshot,
  'generatedAt' | 'uptimeSeconds' | 'signalsTotal' | 'modelRefreshedAt'
>;

@Injectable()
export class SignalsService {
  private readonly startedAt = Date.now();

  getLiveSnapshot(): LiveSignalsSnapshot {
    const now = Date.now();
    const uptimeSeconds = Math.round((now - this.startedAt) / 1000);

    return {
      ...BASELINE,
      generatedAt: new Date(now).toISOString(),
      uptimeSeconds, // One new signal every 5s of uptime keeps the count visibly moving.
      signalsTotal:
        BASELINE.signalsBySource.reduce((sum, source) => sum + source.count, 0) +
        Math.floor(uptimeSeconds / 5),
      modelRefreshedAt: new Date(now - MODEL_REFRESH_MINUTES * 60_000).toISOString(),
    };
  }
}
