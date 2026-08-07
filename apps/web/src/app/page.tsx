import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  Check,
  Database,
  Eye,
  Layers,
  Lock,
  Network,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@peoplelens/ui';

const navLinks = [
  { label: 'Platform', href: '#platform' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Foundation', href: '#foundation' },
];

const trustedBy = ['Vantage', 'Northwind', 'Helios', 'Meridian', 'Atlas', 'Quantum'];

const features = [
  {
    icon: Activity,
    title: 'Workforce Health',
    description:
      'Monitor engagement, attrition risk, and sentiment across teams with early-warning signals instead of rearview metrics.',
  },
  {
    icon: BarChart3,
    title: 'Performance Insights',
    description:
      'Connect goals, reviews, and outcomes into a single performance view leaders can act on — without the spreadsheet sprawl.',
  },
  {
    icon: Network,
    title: 'Organizational Intelligence',
    description:
      'Explore reporting lines, spans of control, and team topology to keep the org chart aligned with business strategy.',
  },
  {
    icon: Building2,
    title: 'Executive Reporting',
    description:
      'Board-ready workforce narratives generated from governed data, with drill-downs for every number on the page.',
  },
  {
    icon: Lock,
    title: 'Data Governance',
    description:
      'Role-based access, field-level masking, and full audit trails so sensitive people data stays inside your perimeter.',
  },
  {
    icon: Zap,
    title: 'Real-time Platform',
    description:
      'An API-first architecture that ingests, transforms, and serves workforce data on a foundation built to scale.',
  },
];

const foundation = [
  {
    icon: Layers,
    title: 'Modular monorepo',
    description:
      'Apps and shared packages under one roof — types, UI primitives, and configs that cannot drift apart.',
  },
  {
    icon: Database,
    title: 'PostgreSQL + Prisma',
    description:
      'A typed, migration-safe data layer ready for the workforce models that arrive in the next phase.',
  },
  {
    icon: Boxes,
    title: 'Containerized delivery',
    description:
      'A Docker-ready foundation so the same artifacts that run on a laptop ship to staging and production.',
  },
];

const chartBars = [42, 58, 47, 71, 64, 82, 76, 92, 85, 98];

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm">
        <Eye className="size-4" aria-hidden />
      </div>
      <span className="text-sm font-semibold tracking-tight">PeopleLens</span>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Brand />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button size="sm">
            Get started
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeroPreview() {
  return (
    <div className="mx-auto mt-20 max-w-4xl" aria-hidden>
      <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-zinc-950/5">
        <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-zinc-200" />
          <span className="size-2.5 rounded-full bg-zinc-200" />
          <span className="size-2.5 rounded-full bg-zinc-200" />
          <span className="ml-3 text-xs text-muted-foreground">
            app.peoplelens.com/workforce-health
          </span>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-[200px_1fr] sm:p-8">
          <div className="hidden flex-col gap-1 sm:flex">
            {['Workforce Health', 'Performance', 'Org Structure', 'Reporting'].map(
              (item, index) => (
                <div
                  key={item}
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    index === 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {item}
                </div>
              ),
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Workforce Health Index</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">87.4</p>
              </div>
              <div className="flex gap-3">
                {[
                  { label: 'Attrition risk', value: '4.2%', tone: 'text-emerald-600' },
                  { label: 'Engagement', value: '78%', tone: 'text-zinc-900' },
                  { label: 'Open roles', value: '132', tone: 'text-zinc-900' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                    <p className={`mt-0.5 text-sm font-semibold ${stat.tone}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex h-28 items-end gap-2">
              {chartBars.map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-zinc-900/70 to-zinc-900 transition-all duration-300 hover:from-indigo-600 hover:to-indigo-400"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
              Data governed under your retention policy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40 [mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,black,transparent_75%)]" />
        <div className="absolute -top-48 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-28 text-center sm:pt-36">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          Enterprise Workforce Intelligence Platform
        </div>

        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tighter sm:text-6xl">
          The health of your workforce, in{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
            one intelligent view
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          PeopleLens helps HR leaders and executives monitor workforce health, performance, and
          organizational structure — turning people data into decisions your board understands.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="group">
            Request a demo
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Button>
          <Button size="lg" variant="outline">
            Explore the platform
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald-600" aria-hidden /> SOC 2 Type II
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald-600" aria-hidden /> GDPR ready
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald-600" aria-hidden /> Deployed on your
            infrastructure
          </span>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function TrustedBy() {
  return (
    <section className="border-y border-border/60 bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by workforce teams at
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {trustedBy.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold tracking-tight text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-indigo-600">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-lg hover:shadow-zinc-950/5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/5 text-primary ring-1 ring-inset ring-border transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="mt-5 font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function Features() {
  return (
    <section id="capabilities" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <SectionHeading
        eyebrow="Capabilities"
        title="Everything workforce intelligence needs"
        description="From early attrition signals to board-ready reporting, PeopleLens covers the full spectrum of people analytics."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}

function Foundation() {
  return (
    <section id="foundation" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24 sm:py-28">
      <div className="rounded-3xl bg-zinc-950 px-6 py-16 text-white sm:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
              Engineering foundation
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Built like an enterprise platform, from day one
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-zinc-400">
              A modular monorepo, strict TypeScript, and a typed data layer mean every future phase
              — data models, authentication, dashboards — lands on a foundation that does not need
              rebuilding.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                'Next.js 15',
                'NestJS',
                'PostgreSQL',
                'Prisma',
                'TypeScript',
                'Tailwind CSS',
                'shadcn/ui',
                'Turborepo',
              ].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            {foundation.map((item) => (
              <div
                key={item.title}
                className="group flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                  <item.icon className="size-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="platform" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-28">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center sm:px-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_0%,rgba(99,102,241,0.12),transparent)]"
          aria-hidden
        />
        <div className="relative">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-lg">
            <Users className="size-6" aria-hidden />
          </div>
          <h2 className="mx-auto mt-6 max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to see your workforce clearly?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-muted-foreground">
            Join the platform that turns people data into a competitive advantage.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="group">
              Start your journey
              <ArrowRight
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Button>
            <Button size="lg" variant="outline">
              <GithubIcon className="size-4" />
              View on GitHub
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const columns: { heading: string; links: string[] }[] = [
    {
      heading: 'Product',
      links: ['Workforce Health', 'Performance', 'Org Structure', 'Reporting'],
    },
    {
      heading: 'Resources',
      links: ['Documentation', 'Architecture', 'API Reference', 'Changelog'],
    },
    { heading: 'Company', links: ['About', 'Careers', 'Security', 'Contact'] },
  ];

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Brand />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Enterprise Workforce Intelligence Platform. Helping HR leaders and executives monitor
            workforce health and organizational structure.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.heading}>
            <p className="text-sm font-semibold">{column.heading}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} PeopleLens. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            All systems operational
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <TrustedBy />
        <Features />
        <Foundation />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
