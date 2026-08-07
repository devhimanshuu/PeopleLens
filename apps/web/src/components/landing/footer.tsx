import { GithubIcon, LinkedinIcon, XIcon } from './social-icons';
import { Logo } from './logo';

const columns = [
  {
    heading: 'Product',
    links: ['Workforce Health', 'Attrition Predictor', 'Org Structure Mapper', 'Board Narratives'],
  },
  {
    heading: 'Solutions',
    links: ['Executive View', 'HRBP View', 'Manager View', 'Data Mesh'],
  },
  {
    heading: 'Company',
    links: ['About', 'Careers', 'Security', 'Contact'],
  },
  {
    heading: 'Resources',
    links: ['Documentation', 'API Reference', 'Status', 'Changelog'],
  },
];

const socials = [
  { label: 'GitHub', icon: GithubIcon },
  { label: 'LinkedIn', icon: LinkedinIcon },
  { label: 'X', icon: XIcon },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <a
              href="#top"
              className="group flex w-fit items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Logo />
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Enterprise Workforce Intelligence Platform — real-time predictive people analytics for
              HR leaders and executives.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3.5 py-1.5 text-xs text-foreground/80 backdrop-blur">
              <span className="relative flex size-1.5" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              All Systems Operational
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="text-sm font-semibold text-foreground">{column.heading}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#top"
                      className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} PeopleLens. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {['Privacy', 'Terms', 'Security', 'DPA', 'Cookies'].map((item) => (
              <a key={item} href="#top" className="transition-colors hover:text-foreground">
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {socials.map((social) => (
              <a
                key={social.label}
                href="#top"
                aria-label={social.label}
                className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <social.icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
