'use client';

import type { DashboardOverview } from '@peoplelens/types';
import {
  ArrowUpRight,
  Building2,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ScrollText,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/use-async';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatRelative, STATUS_LABELS, STATUS_VARIANTS, fullName } from '@/lib/format';

interface QuickAction {
  href: string;
  label: string;
  icon: typeof Plus;
}

export default function DashboardPage() {
  const { role } = useAuth();
  const { data, loading, error, refetch } = useAsync<DashboardOverview>(() =>
    api.get('/dashboard/overview'),
  );
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  // Track when the latest payload was fetched for the "Updated X ago" label.
  useEffect(() => {
    if (data) setRefreshedAt(new Date());
  }, [data]);

  // Write actions (add/import) only for roles that can actually perform them;
  // admin-only destinations stay gated to admins — mirrors the sidebar.
  const canWrite = role === 'admin' || role === 'manager';
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

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <ErrorState description={error} onRetry={() => void refetch()} />
      ) : data ? (
        <div className="space-y-6">
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
