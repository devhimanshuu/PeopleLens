'use client';

import {
  BarChart3,
  Building2,
  ChevronRight,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Search,
  ShieldCheck,
  Users as UsersIcon,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/landing/logo';
import { ThemeToggle } from '@/components/landing/theme-toggle';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { CommandPalette, CommandPaletteTrigger } from './command-palette';
import { UserMenu } from './user-menu';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles that may see this item. */
  roles: Array<'admin' | 'manager' | 'viewer'>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const DASHBOARD_ITEM: NavItem = {
  href: '/dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
  roles: ['admin', 'manager', 'viewer'],
};
const EMPLOYEES_ITEM: NavItem = {
  href: '/employees',
  label: 'Employees',
  icon: UsersIcon,
  roles: ['admin', 'manager', 'viewer'],
};
const DEPARTMENTS_ITEM: NavItem = {
  href: '/departments',
  label: 'Departments',
  icon: Building2,
  roles: ['admin', 'manager', 'viewer'],
};
const TEAMS_ITEM: NavItem = {
  href: '/teams',
  label: 'Teams',
  icon: BarChart3,
  roles: ['admin', 'manager', 'viewer'],
};
const IMPORTS_ITEM: NavItem = {
  href: '/imports',
  label: 'CSV Import',
  icon: FileSpreadsheet,
  roles: ['admin', 'manager'],
};
const AUDIT_ITEM: NavItem = {
  href: '/audit-logs',
  label: 'Audit Log',
  icon: ScrollText,
  roles: ['admin'],
};
const USERS_ITEM: NavItem = {
  href: '/users',
  label: 'Users & Roles',
  icon: ShieldCheck,
  roles: ['admin'],
};

const NAV_SECTIONS: NavSection[] = [
  { label: 'Overview', items: [DASHBOARD_ITEM] },
  { label: 'Workforce', items: [EMPLOYEES_ITEM, DEPARTMENTS_ITEM, TEAMS_ITEM] },
  { label: 'Operations', items: [IMPORTS_ITEM, AUDIT_ITEM] },
  { label: 'System', items: [USERS_ITEM] },
];

/** Page label per top-level route, used for breadcrumbs. */
const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  departments: 'Departments',
  teams: 'Teams',
  imports: 'CSV Import',
  users: 'Users & Roles',
  'audit-logs': 'Audit Log',
};

/** Generic label for second-level routes (e.g. employee/team details). */
const DETAIL_LABELS: Record<string, string> = {
  employees: 'Employee profile',
  teams: 'Team details',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  viewer: 'Viewer',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, profile, initializing, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const roleType = role ?? 'viewer';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-md lg:hidden">
        <Link href="/dashboard" aria-label="PeopleLens dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search (command palette)"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="size-5" aria-hidden />
          </button>
          <ThemeToggle />
          <UserMenu />
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-label="Toggle navigation"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {sidebarOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[16rem_1fr]">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 border-r border-border/60 bg-card/60 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:bg-transparent',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center justify-between border-b border-border/60 px-5">
              <Link
                href="/dashboard"
                aria-label="PeopleLens dashboard"
                className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Logo />
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation"
                className="rounded-md p-1 text-muted-foreground hover:text-foreground lg:hidden"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <nav
              className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
              aria-label="Main navigation"
            >
              {NAV_SECTIONS.map((section) => {
                const visibleItems = section.items.filter(
                  (item) => role && item.roles.includes(role),
                );
                if (visibleItems.length === 0) return null;
                return (
                  <div key={section.label}>
                    <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {section.label}
                    </p>
                    <div className="space-y-0.5">
                      {visibleItems.map((item) => {
                        const isActive =
                          pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                              'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                          >
                            {isActive ? (
                              <span
                                className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                                aria-hidden
                              />
                            ) : null}
                            <item.icon className="size-4 shrink-0" aria-hidden />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            <div className="border-t border-border/60 p-3">
              {initializing ? (
                <div className="animate-pulse space-y-2 rounded-lg bg-muted p-3">
                  <div className="h-3 w-24 rounded bg-muted-foreground/20" />
                  <div className="h-2.5 w-16 rounded bg-muted-foreground/15" />
                </div>
              ) : profile ? (
                <div className="flex items-center gap-3 rounded-lg p-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white">
                    {initials(profile.name || profile.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{profile.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {ROLE_LABEL[profile.role] ?? profile.role}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void signOut();
                      router.replace('/');
                    }}
                    aria-label="Sign out"
                    title="Sign out"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
                  >
                    <LogOut className="size-4" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="min-w-0">
          <header className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b border-border/60 bg-background/85 px-6 backdrop-blur-md lg:flex">
            <Breadcrumbs pathname={pathname} />
            <div className="flex items-center gap-2">
              <CommandPaletteTrigger onOpen={() => setPaletteOpen(true)} />
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>

          <main
            key={pathname}
            className="page-enter mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
          >
            {children}
          </main>

          <footer className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
            <p className="border-t border-border/40 pt-4 text-center text-[11px] text-muted-foreground/70">
              PeopleLens · Enterprise Workforce Intelligence · Signed in as {ROLE_LABEL[roleType]}
            </p>
          </footer>
        </div>
      </div>

      {/* Backdrop for the mobile drawer */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      ) : null}

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

/** Breadcrumb trail for the desktop topbar: Home / Section / (Detail). */
function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean);
  const section = segments[0];
  const detail = segments[1];
  const sectionLabel = section ? (BREADCRUMB_LABELS[section] ?? titleCase(section)) : 'Home';

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link
        href="/dashboard"
        className="truncate text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        Home
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
      <Link
        href={section ? `/${section}` : '/dashboard'}
        aria-current={detail ? undefined : 'page'}
        className={cn(
          'truncate font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded',
          detail ? 'text-muted-foreground hover:text-foreground' : 'text-foreground',
        )}
      >
        {sectionLabel}
      </Link>
      {detail ? (
        <>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
          <span aria-current="page" className="truncate text-foreground">
            {section ? (DETAIL_LABELS[section] ?? titleCase(detail)) : titleCase(detail)}
          </span>
        </>
      ) : null}
    </nav>
  );
}

function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
