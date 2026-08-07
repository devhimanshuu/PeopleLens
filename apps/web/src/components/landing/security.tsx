'use client';

import { Fingerprint, Globe, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { SectionHeading } from './decor';
import { Reveal } from './reveal';

const certifications = [
  {
    icon: ShieldCheck,
    title: 'SOC 2 Type II',
    description: 'Independently audited security and availability controls',
  },
  {
    icon: Globe,
    title: 'GDPR',
    description: 'Data residency and subject-rights compliance built in',
  },
  {
    icon: KeyRound,
    title: 'ISO 27001',
    description: 'Certified information security management system',
  },
  {
    icon: Lock,
    title: 'HIPAA',
    description: 'Safeguards for protected workforce health data',
  },
  {
    icon: Fingerprint,
    title: 'Role-based Access Control',
    description: 'Field-level permissions with complete audit trails',
  },
];

export function Security() {
  return (
    <section id="enterprise" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Enterprise Security & Governance"
          title="Built for the most regulated workforce teams"
          description="Your people data stays inside your perimeter — with certifications your security team will recognize."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {certifications.map((item, index) => (
            <Reveal key={item.title} delay={0.08 * index}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border surface p-6 backdrop-blur-md transition-colors duration-300 hover:border-indigo-400/40">
                <div
                  aria-hidden
                  className="absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-indigo-500/0 blur-2xl transition-colors duration-500 group-hover:bg-indigo-500/20"
                />
                <div className="relative">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-indigo-600 transition-transform duration-300 group-hover:scale-110 dark:text-indigo-300">
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2} className="mt-10 text-center">
          <p className="text-sm text-muted-foreground/80">
            Deployed in your cloud · data never leaves your perimeter · zero-knowledge encryption
            for dormant records
          </p>
        </Reveal>
      </div>
    </section>
  );
}
