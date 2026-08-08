import type { EmployeeStatus, Gender } from '@peoplelens/types';
import type { BadgeProps } from '@/components/ui/badge';

/** Human-readable employment status labels. */
export const STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  probation: 'Probation',
  terminated: 'Terminated',
};

/** Badge tone per employment status. */
export const STATUS_VARIANTS: Record<EmployeeStatus, NonNullable<BadgeProps['variant']>> = {
  active: 'success',
  on_leave: 'warning',
  probation: 'info',
  terminated: 'danger',
};

/** Human-readable gender labels. */
export const GENDER_LABELS: Record<Gender, string> = {
  female: 'Female',
  male: 'Male',
  non_binary: 'Non-binary',
  prefer_not_to_say: 'Prefer not to say',
};

/** Formats an ISO date as a short human date (e.g. Jun 1, 2023). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Formats an ISO date relative to now (e.g. "3d ago"). */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Formats a full name from first/last. */
export function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

/** Formats an employee count with a label. */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
