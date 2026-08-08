'use client';

import type { DashboardFilters, DashboardOverview, Gender, Role } from '@peoplelens/types';
import {
  ArrowUpRight,
  Building2,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ScrollText,
  Sparkles,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  DashboardKpis,
  DepartmentDistributionChart,
  DistributionDonut,
} from '@/components/dashboard/charts';
import { PageHeader } from '@/components/app-shell/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Select, type SelectOption } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/use-async';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  formatDate,
  formatRelative,
  GENDER_LABELS,
  STATUS_LABELS,
  STATUS_VARIANTS,
  fullName,
} from '@/lib/format';

const GENDER_OPTIONS: SelectOption[] = Object.entries(GENDER_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const STATUS_OPTIONS: SelectOption[] = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/** Serializes the active filters into a stable dependency key. */
function filterKey(filters: DashboardFilters): string {
  return JSON.stringify(filters);
}

interface QuickAction {
  href: string;
  label: string;
  icon: typeof Plus;
}

const WELCOME_DISMISS_KEY = 'peoplelens_welcome_dismissed';

export default function DashboardPage() {
  const { role, profile } = useAuth();
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  // The welcome card is a first-run hint for accounts with no linked employee
  // profile; the dismissal is per-tab-session so it returns on the next login.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(WELCOME_DISMISS_KEY)) setWelcomeDismissed(true);
    } catch {
      // sessionStorage unavailable (private mode) — the card just stays visible.
    }
  }, []);

  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    try {
      sessionStorage.setItem(WELCOME_DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const key = useMemo(() => filterKey(filters), [filters]);
  const { data, loading, error, refetch } = useAsync<DashboardOverview>(() => {
    const params = new URLSearchParams();
    if (filters.departmentId) params.set('departmentId', filters.departmentId);
    if (filters.status) params.set('status', filters.status);
    if (filters.gender) params.set('gender', filters.gender);
    const qs = params.toString();
    return api.get(`/dashboard/overview${qs ? `?${qs}` : ''}`);
  }, [key]);

  // Track when the latest payload was fetched for the "Updated X ago" label.
  useEffect(() => {
    if (data) setRefreshedAt(new Date());
  }, [data]);

  // Department options come back with every overview (scope-aware for
  // managers), so the filter dropdown can never offer an out-of-scope choice.
  const departmentOptions: SelectOption[] = useMemo(
    () => (data?.departments ?? []).map((d) => ({ value: d.id, label: d.name })),
    [data?.departments],
  );

  const activeFilterCount =
    (filters.departmentId ? 1 : 0) + (filters.status ? 1 : 0) + (filters.gender ? 1 : 0);

  const setFilter = <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    setFilters((current) => {
      const next = { ...current };
      if (value === undefined || value === '') {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  // Write actions (add/import) only for roles that can actually perform them;
  // admin-only destinations stay gated to admins — mirrors the sidebar.
  const canWrite = role === 'admin' || role === 'manager';

  // First-run: an account with no linked employee profile is brand new — give
  // it a clear, role-aware welcome instead of a silent empty dashboard.
  const showWelcome = Boolean(profile && !profile.employeeId && !welcomeDismissed);

  // Empty-org: an organization with zero employees needs a next step, not a
  // wall of zero-filled charts.
  const isOrgEmpty = Boolean(data && data.kpis.totalEmployees === 0);
  const quickActions: QuickAction[] = [
    ...(canWrite ? [{ href: '/employees', label: 'Add employee', icon: Plus }] : []),
    ...(canWrite ? [{ href: '/imports', label: 'Import CSV', icon: FileSpreadsheet }] : []),
    ...(role === 'admin'
      ? [{ href: '/departments', label: 'New department', icon: Building2 }]
      : []),
    ...(role === 'admin' ? [{ href: '/audit-logs', label: 'Audit log', icon: ScrollText }] : []),
  ];

  const handleRefresh = () => {
    setRefreshedAt(null);
    void refetch();
  };

  // Keep the last-good dashboard visible during filter changes — the skeleton
  // only appears on the very first load.
  const showSkeleton = loading && !data;

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Workforce Dashboard"
        description="Live headcount, organizational structure, and employee composition at a glance."
        actions={
          <div className="flex items-center gap-2">
            {refreshedAt ? (
              <span
                className="hidden text-xs text-muted-foreground sm:inline"
                title={formatDate(refreshedAt.toISOString())}
              >
                Updated {formatRelative(refreshedAt.toISOString())}
              </span>
            ) : null}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={loading ? 'size-3.5 animate-spin' : 'size-3.5'} aria-hidden />
              Refresh
            </Button>
          </div>
        }
      />

      {showWelcome ? (
        <div className="mb-6">
          <WelcomeCard role={role} name={profile?.name} onDismiss={dismissWelcome} />
        </div>
      ) : null}

      {showSkeleton ? (
        <DashboardSkeleton />
      ) : error && !data ? (
        <ErrorState description={error} onRetry={() => void refetch()} />
      ) : data && isOrgEmpty ? (
        <EmptyOrgState canWrite={canWrite} />
      ) : data ? (
        <div className="space-y-6">
          {/* Global slice filters — one coherent state feeding the whole
              overview (KPIs + all charts update together). */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/60 p-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Filters
            </span>
            <Select
              aria-label="Filter by department"
              placeholder="All departments"
              value={filters.departmentId ?? ''}
              onChange={(event) => setFilter('departmentId', event.target.value)}
              options={departmentOptions}
              className="w-48"
            />
            <Select
              aria-label="Filter by employment status"
              placeholder="All statuses"
              value={filters.status ?? ''}
              onChange={(event) =>
                setFilter('status', event.target.value as DashboardFilters['status'])
              }
              options={STATUS_OPTIONS}
              className="w-44"
            />
            <Select
              aria-label="Filter by gender"
              placeholder="All genders"
              value={filters.gender ?? ''}
              onChange={(event) => setFilter('gender', event.target.value as Gender)}
              options={GENDER_OPTIONS}
              className="w-44"
            />
            {activeFilterCount > 0 ? (
              <>
                <Badge variant="secondary" className="h-6">
                  {activeFilterCount} active
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({})}
                  aria-label="Clear all filters"
                >
                  Reset
                </Button>
              </>
            ) : null}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quick actions
            </span>
            {quickActions.map((action) => (
              <Button key={action.label} variant="secondary" size="sm" asChild>
                <Link href={action.href}>
                  <action.icon className="size-3.5" aria-hidden /> {action.label}
                </Link>
              </Button>
            ))}
          </div>

          <DashboardKpis overview={data} />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <DepartmentDistributionChart data={data.departmentDistribution} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <DistributionDonut data={data.employeeStatus} title="Status" />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <DistributionDonut data={data.genderDistribution} title="Gender" />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent Hires</CardTitle>
                <Link
                  href="/employees"
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500 transition-colors hover:text-indigo-400 dark:text-indigo-300"
                >
                  View all <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </CardHeader>
              <CardContent>
                {data.recentHires.length === 0 ? (
                  <EmptyState
                    title="No recent hires"
                    description="Hires will appear here as employees join the organization."
                  />
                ) : (
                  <ul className="divide-y divide-border/60">
                    {data.recentHires.map((employee) => (
                      <li key={employee.id} className="flex items-center gap-3 py-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-xs font-semibold text-indigo-500 dark:text-indigo-300">
                          {initials(employee.firstName, employee.lastName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {fullName(employee.firstName, employee.lastName)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {employee.jobTitle}
                            {employee.department ? ` · ${employee.department.name}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={STATUS_VARIANTS[employee.status]}>
                            {STATUS_LABELS[employee.status]}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            Hired {formatDate(employee.hiredAt)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * First-run welcome card for accounts with no linked employee profile.
 * Explains the caller's role and points at the right next step — a new user
 * should never land on a silent dashboard with no idea where they are.
 */
function WelcomeCard({
  role,
  name,
  onDismiss,
}: {
  role: Role | null;
  name?: string;
  onDismiss: () => void;
}) {
  const firstName = name?.trim().split(/\s+/)[0] ?? 'there';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  const title = isAdmin
    ? `Welcome, ${firstName} — you have full access`
    : isManager
      ? `Welcome, ${firstName} — you're a department manager`
      : `Welcome to PeopleLens, ${firstName}`;

  const body = isAdmin
    ? "You're signed in as an Administrator. Import your workforce CSV, organize departments and teams, and manage user roles from the sidebar — every feature is available to you."
    : isManager
      ? "You're signed in as a Manager. You can add, edit, and import employees within your assigned departments — read-only everywhere else."
      : "You're signed in as a Viewer with read-only access. Browse the analytics dashboard, employee directory, and organizational structure. To contribute, ask an Administrator to link your employee profile or upgrade your role.";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-card to-cyan-500/10 p-5">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss welcome message"
        className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
      <div className="flex items-start gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-sm">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isAdmin || isManager ? (
              <Button size="sm" asChild>
                <Link href="/imports">Import CSV</Link>
              </Button>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link href="/employees">Browse employees</Link>
            </Button>
            {isAdmin ? (
              <Button size="sm" variant="outline" asChild>
                <Link href="/users">Manage users</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Guidance shown when the organization has no workforce records yet. */
function EmptyOrgState({ canWrite }: { canWrite: boolean }) {
  return (
    <EmptyState
      icon={UsersIcon}
      title={canWrite ? 'Your organization has no workforce data yet' : 'No workforce data yet'}
      description={
        canWrite
          ? 'Import your employee CSV or add your first employee to start analyzing your workforce.'
          : "This organization doesn't have any workforce data yet. Check back soon — or ask an Administrator to import a dataset."
      }
      action={
        canWrite ? (
          <div className="flex gap-2">
            <Button size="sm" asChild>
              <Link href="/imports">Import CSV</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/employees">Add employee</Link>
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}

/** Skeleton mirror of the dashboard layout while metrics load. */
function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-5 h-52 w-full" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-5 h-52 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}
