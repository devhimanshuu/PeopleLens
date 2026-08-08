'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  BarChart,
  Code,
  FileText,
  Handshake,
  HelpCircle,
  Leaf,
  MessageSquare,
  Network,
  Radar,
  RotateCcw,
  Shield,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/landing/logo';
import { ThemeToggle } from '@/components/landing/theme-toggle';
import { getStoredSession, signOutNeon, syncOAuthSession, type NeonSession } from '@/lib/auth';

type LinkItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

const productLinks: LinkItem[] = [
  {
    title: 'Attrition Risk Predictor',
    href: '#capabilities',
    description: 'Simulate retention impact across policy scenarios',
    icon: Radar,
  },
  {
    title: 'Unified Data Mesh',
    href: '#capabilities',
    description: 'HRIS, ATS and engagement normalized in one model',
    icon: Network,
  },
  {
    title: 'Board-Ready Narratives',
    href: '#capabilities',
    description: 'Automated executive decks from live signals',
    icon: FileText,
  },
  {
    title: 'Real-time Sentiment Radar',
    href: '#capabilities',
    description: 'Engagement and pulse signals, refreshed hourly',
    icon: MessageSquare,
  },
  {
    title: 'Executive Analytics',
    href: '#solutions',
    description: 'Board-level pulse across every region and function',
    icon: BarChart,
  },
  {
    title: 'Integrations & API',
    href: '#solutions',
    description: 'Connect Workday, BambooHR, Greenhouse and more',
    icon: Code,
  },
];

const companyLinks: LinkItem[] = [
  { title: 'About Us', href: '#top', description: 'The team behind PeopleLens', icon: Users },
  {
    title: 'Customer Stories',
    href: '#enterprise',
    description: 'How enterprises de-risk their workforce',
    icon: Star,
  },
  {
    title: 'Partnerships',
    href: '#enterprise',
    description: 'Collaborate with us for mutual growth',
    icon: Handshake,
  },
];

const companyLinks2: LinkItem[] = [
  { title: 'Terms of Service', href: '#top', icon: FileText },
  { title: 'Privacy Policy', href: '#top', icon: Shield },
  { title: 'Data Processing Addendum', href: '#top', icon: RotateCcw },
  { title: 'Blog', href: '#top', icon: Leaf },
  { title: 'Help Center', href: '#top', icon: HelpCircle },
];

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = React.useState(false);

  const onScroll = React.useCallback(() => {
    setScrolled(window.scrollY > threshold);
  }, [threshold]);

  React.useEffect(() => {
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  // Also check on first load.
  React.useEffect(() => {
    onScroll();
  }, [onScroll]);

  return scrolled;
}

export function Header() {
  const [open, setOpen] = React.useState(false);
  const [session, setSession] = React.useState<NeonSession | null>(null);
  const scrolled = useScroll(10);

  React.useEffect(() => {
    setSession(getStoredSession());
    // Pick up a Managed Better Auth session (e.g. after an OAuth redirect) so
    // the signed-in indicator appears without a hard refresh.
    if (!getStoredSession()) {
      syncOAuthSession().then((s) => {
        if (s) setSession(s);
      });
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-[padding] duration-500 ease-out',
          scrolled && 'py-2.5',
        )}
      >
        <nav
          className={cn(
            'mx-auto flex w-full items-center justify-between px-5 transition-all duration-500 ease-out sm:px-8',
            scrolled
              ? 'h-14 max-w-6xl rounded-2xl border border-border/60 bg-background/85 shadow-lg shadow-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60'
              : 'h-16 max-w-7xl border-b border-transparent bg-transparent',
          )}
        >
          <div className="flex items-center gap-5">
            <a
              href="#top"
              className="group rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Logo shimmer />
            </a>
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">Product</NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-background p-1 pr-1.5">
                    <ul className="bg-popover grid w-lg grid-cols-2 gap-2 rounded-md border p-2 shadow">
                      {productLinks.map((item, i) => (
                        <li key={i}>
                          <ListItem {...item} />
                        </li>
                      ))}
                    </ul>
                    <div className="p-2">
                      <p className="text-sm text-muted-foreground">
                        Interested?{' '}
                        <a href="#pricing" className="font-medium text-foreground hover:underline">
                          Schedule a demo
                        </a>
                      </p>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">Company</NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-background p-1 pb-1.5 pr-1.5">
                    <div className="grid w-lg grid-cols-2 gap-2">
                      <ul className="bg-popover space-y-2 rounded-md border p-2 shadow">
                        {companyLinks.map((item, i) => (
                          <li key={i}>
                            <ListItem {...item} />
                          </li>
                        ))}
                      </ul>
                      <ul className="space-y-2 p-3">
                        {companyLinks2.map((item, i) => (
                          <li key={i}>
                            <NavigationMenuLink
                              href={item.href}
                              className="flex flex-row items-center gap-x-2 rounded-md p-2 hover:bg-accent"
                            >
                              <item.icon className="size-4 text-foreground" />
                              <span className="font-medium">{item.title}</span>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <a
                    href="#pricing"
                    className="rounded-md px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Pricing
                  </a>
                </NavigationMenuLink>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="hidden items-center gap-2.5 md:flex">
            <ThemeToggle />
            {session ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {session.user.name || session.user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await signOutNeon();
                    setSession(null);
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/signin">Sign In</Link>
                </Button>
                <Button size="sm" className="group relative overflow-hidden" asChild>
                  <Link href="/signup">
                    <span aria-hidden className="btn-shine absolute inset-0" />
                    <span className="relative">Request Demo</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button
              size="icon"
              variant="outline"
              onClick={() => setOpen(!open)}
              className="md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              <MenuToggleIcon open={open} className="size-5" duration={300} />
            </Button>
          </div>
        </nav>
        <MobileMenu
          open={open}
          className={cn(
            'flex flex-col justify-between gap-2 overflow-y-auto',
            scrolled ? 'top-[4.75rem]' : 'top-16',
          )}
        >
          <NavigationMenu className="max-w-full">
            <div className="flex w-full flex-col gap-y-2">
              <span className="text-sm font-medium text-muted-foreground">Product</span>
              {productLinks.map((link) => (
                <ListItem key={link.title} {...link} />
              ))}
              <span className="text-sm font-medium text-muted-foreground">Company</span>
              {companyLinks.map((link) => (
                <ListItem key={link.title} {...link} />
              ))}
              {companyLinks2.map((link) => (
                <ListItem key={link.title} {...link} />
              ))}
            </div>
          </NavigationMenu>
          <div className="flex flex-col gap-2">
            {session ? (
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={async () => {
                  await signOutNeon();
                  setSession(null);
                  setOpen(false);
                }}
              >
                Sign Out ({session.user.name || session.user.email})
              </Button>
            ) : (
              <>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/signin">Sign In</Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link href="/signup">Request Demo</Link>
                </Button>
              </>
            )}
          </div>
        </MobileMenu>
      </header>
    </>
  );
}

type MobileMenuProps = React.ComponentProps<'div'> & {
  open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      id="mobile-menu"
      className={cn(
        'bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg',
        // top offset is passed by the caller (top-16 at rest, below the floating pill when scrolled)
        'fixed bottom-0 left-0 right-0 z-40 flex flex-col overflow-hidden border-y md:hidden',
      )}
    >
      <div
        data-slot={open ? 'open' : 'closed'}
        className={cn(
          'data-[slot=open]:animate-in data-[slot=open]:zoom-in-97 ease-out',
          'size-full p-4',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function ListItem({
  title,
  description,
  icon: Icon,
  className,
  href,
  ...props
}: React.ComponentProps<typeof NavigationMenuLink> & LinkItem) {
  return (
    <NavigationMenuLink
      className={cn(
        'flex w-full flex-row gap-x-2 rounded-md p-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground',
        className,
      )}
      {...props}
      asChild
    >
      <a href={href}>
        <div className="flex aspect-square size-10 items-center justify-center rounded-md border bg-muted shadow-sm">
          <Icon className="size-5 text-foreground" />
        </div>
        <div className="flex flex-col items-start justify-center">
          <span className="font-medium">{title}</span>
          {description ? (
            <span className="text-xs text-muted-foreground">{description}</span>
          ) : null}
        </div>
      </a>
    </NavigationMenuLink>
  );
}
