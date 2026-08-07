'use client';

import { MotionConfig } from 'framer-motion';
import { Header } from '@/components/ui/header-3';
import { HeroSection } from '@/components/ui/hero-3';
import { Bento } from './bento';
import { Cta } from './cta';
import { Footer } from './footer';
import { Roi } from './roi';
import { Security } from './security';
import { Showcase } from './showcase';

export function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-x-clip bg-background text-foreground selection:bg-indigo-500/40">
        <Header />
        <main>
          <HeroSection />
          <Bento />
          <Showcase />
          <Security />
          <Roi />
          <Cta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
