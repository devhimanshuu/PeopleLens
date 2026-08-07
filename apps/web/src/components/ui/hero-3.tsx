'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Play, ShieldCheck, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fadeUpItem, staggerContainer } from '@/components/landing/anim';
import { GlowOrb, GridPattern, NetworkGraph, NoiseOverlay } from '@/components/landing/decor';
import { HeroDashboard, MOCK_SNAPSHOT } from '@/components/landing/hero-dashboard';
import { Magnetic } from '@/components/landing/magnetic';
import { fetchHealth, fetchLiveSignals } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TRUST_AVATARS = [
  { initials: 'VN', className: 'from-indigo-500 to-indigo-400' },
  { initials: 'SK', className: 'from-cyan-500 to-cyan-400' },
  { initials: 'DM', className: 'from-emerald-500 to-emerald-400' },
  { initials: 'AR', className: 'from-violet-500 to-violet-400' },
];

/**
 * Live KPI chip values. Mirrors the dashboard's fetch pattern (poll every
 * 30s) so the floating chips never contradict the dashboard beside them;
 * falls back to the shared MOCK_SNAPSHOT when the API is unreachable.
 */
function useLiveMetrics() {
  const [snapshot, setSnapshot] = useState(MOCK_SNAPSHOT);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const [signals, healthResult] = await Promise.allSettled([fetchLiveSignals(), fetchHealth()]);
      if (cancelled) return;
      if (signals.status === 'fulfilled' && signals.value) {
        setSnapshot(signals.value);
      } else if (healthResult.status === 'rejected') {
        setSnapshot(MOCK_SNAPSHOT);
      }
    }
    void refresh();
    const interval = setInterval(() => void refresh(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return snapshot;
}

export function HeroSection() {
  const snapshot = useLiveMetrics();

  return (
    <section id="top" className="relative overflow-hidden pb-14 pt-8 sm:pb-20 sm:pt-12">
      {/* Ambient backdrop */}
      <div aria-hidden="true" className="absolute inset-0 size-full overflow-hidden">
        <div
          className={cn(
            'absolute inset-0 isolate -z-10',
            'bg-[radial-gradient(20%_80%_at_20%_0%,--theme(--color-foreground/.06),transparent)]',
          )}
        />
        <GridPattern />
        <GlowOrb className="-top-32 -left-40 bg-indigo-600/20" size={520} />
        <GlowOrb className="top-40 -right-32 bg-cyan-500/10" size={460} duration={11} />
        <NetworkGraph className="absolute inset-x-0 top-8 mx-auto h-[420px] w-full max-w-7xl opacity-40" />
        <NoiseOverlay />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 sm:px-8 sm:gap-14"
      >
        {/* Eyebrow pill */}
        <motion.div variants={fadeUpItem} className="mx-auto">
          <a
            href="#capabilities"
            className="group flex w-fit items-center gap-3 rounded-full border border-border bg-card/80 p-1 pr-2 shadow-sm backdrop-blur-md transition-colors hover:border-foreground/25"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 shadow-sm">
              <span className="relative flex size-1.5" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest">Now</p>
            </span>

            <span className="text-xs text-foreground/80">
              Announcing PeopleLens 2.0 — Predictive Flight Risk AI
            </span>
            <span className="hidden h-5 border-l border-border sm:block" aria-hidden />

            <div className="pr-1" aria-hidden>
              <ArrowRight className="size-3 -translate-x-0.5 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </a>
        </motion.div>

        {/* Two-column hero: copy + live visual */}
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Copy column */}
          <div className="flex flex-col items-center text-center lg:col-span-5 lg:items-start lg:text-left">
            <motion.h1
              variants={fadeUpItem}
              className="text-balance font-display text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl xl:text-6xl"
            >
              Turn Fragmented HR Data into{' '}
              <span className="text-gradient">Enterprise Workforce Intelligence</span>
            </motion.h1>

            <motion.p
              variants={fadeUpItem}
              className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Unify signals across HRIS, ATS, and engagement. Move from rearview metrics to
              real-time predictive organizational foresight.
            </motion.p>

            <motion.div
              variants={fadeUpItem}
              className="mt-7 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row lg:items-start"
            >
              <Magnetic className="w-full sm:w-auto">
                <Button size="lg" className="group relative w-full overflow-hidden sm:w-auto">
                  <span aria-hidden className="btn-shine absolute inset-0" />
                  <span className="relative">Schedule Enterprise Demo</span>
                  <ArrowRight
                    className="relative size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Button>
              </Magnetic>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <span className="flex size-6 items-center justify-center rounded-full bg-indigo-500/20">
                  <Play className="size-3 fill-current" aria-hidden />
                </span>
                Explore Live Sandbox
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              variants={fadeUpItem}
              className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-4 lg:items-start"
            >
              <div className="flex -space-x-2.5" aria-hidden>
                {TRUST_AVATARS.map((avatar) => (
                  <span
                    key={avatar.initials}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-semibold text-white ring-2 ring-background',
                      avatar.className,
                    )}
                  >
                    {avatar.initials}
                  </span>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Trusted by HR &amp; People Operations leaders at{' '}
                <span className="font-medium text-foreground">200+ enterprises</span>
                <span className="mt-1 flex items-center justify-center gap-1.5 lg:justify-start">
                  <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden />
                  SOC 2 Type II · GDPR · ISO 27001
                </span>
              </p>
            </motion.div>
          </div>

          {/* Visual column */}
          <motion.div variants={fadeUpItem} className="relative lg:col-span-7 lg:pl-4 xl:pl-8">
            <div
              aria-hidden
              className={cn(
                'absolute -inset-x-16 -top-16 -bottom-16 rounded-full',
                'bg-[radial-gradient(ellipse_at_center,--theme(--color-foreground/.08),transparent,transparent)]',
                'blur-[50px]',
              )}
            />
            <div className="relative">
              <div className="relative overflow-hidden rounded-xl border border-border bg-background p-2 shadow-xl shadow-indigo-500/10 ring-1 ring-card dark:shadow-indigo-950/40">
                <HeroDashboard />
              </div>

              {/* Floating metric chips — decorative, never intercept pointer */}
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden
                className="pointer-events-none absolute -bottom-4 left-0 hidden items-center gap-2.5 rounded-xl border border-border bg-card/90 px-3.5 py-2.5 shadow-lg shadow-indigo-500/10 backdrop-blur-md sm:flex lg:-bottom-5 lg:-left-6"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15">
                  <TrendingUp className="size-4 text-emerald-500" aria-hidden />
                </span>
                <span>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Flight risk
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    −{snapshot.flightRiskPercent.toFixed(1)} pts{' '}
                    <span className="font-normal text-muted-foreground">this quarter</span>
                  </p>
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden
                className="pointer-events-none absolute -top-4 right-0 hidden items-center gap-2.5 rounded-xl border border-border bg-card/90 px-3.5 py-2.5 shadow-lg shadow-indigo-500/10 backdrop-blur-md sm:flex lg:-right-6 lg:-top-5"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/15">
                  <ShieldCheck className="size-4 text-indigo-500" aria-hidden />
                </span>
                <span>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Governance
                  </p>
                  <p className="text-sm font-semibold text-foreground">Role-based access</p>
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll cue */}
      <motion.a
        href="#capabilities"
        aria-label="Scroll to capabilities"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        className="relative z-10 mx-auto mt-12 hidden w-fit flex-col items-center gap-1.5 text-muted-foreground/70 transition-colors hover:text-foreground sm:flex"
      >
        <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="size-4" aria-hidden />
        </motion.span>
      </motion.a>
    </section>
  );
}
