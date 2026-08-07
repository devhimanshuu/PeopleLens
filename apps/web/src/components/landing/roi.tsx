'use client';

import { CountUp } from './count-up';
import { SectionHeading } from './decor';
import { Reveal } from './reveal';

const stats = [
  {
    value: 34,
    suffix: '%',
    decimals: 0,
    label: 'Reduction in unwanted turnover',
    description: 'Early-warning interventions across pilot cohorts',
  },
  {
    value: 10,
    suffix: '×',
    decimals: 0,
    label: 'Faster board reporting',
    description: 'From raw data pull to polished narrative in hours',
  },
  {
    value: 100,
    suffix: '%',
    decimals: 0,
    label: 'Data governance coverage',
    description: 'Field-level access control on every dataset',
  },
  {
    value: 2.1,
    suffix: '×',
    decimals: 1,
    label: 'Faster HRBP response',
    description: 'Shorter risk-to-action cycle across supported teams',
  },
];

export function Roi() {
  return (
    <section className="scroll-mt-24 bg-muted/40 py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Impact"
          title="Outcomes your leadership will feel"
          description="Measured across enterprise deployments — not marketing averages."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={0.08 * index}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border surface p-6 backdrop-blur-md transition-colors duration-300 hover:border-foreground/20">
                <p className="font-display text-5xl font-semibold tracking-tight">
                  <span className="text-gradient">
                    <CountUp to={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                  </span>
                </p>
                <p className="mt-4 text-sm font-semibold text-foreground">{stat.label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
