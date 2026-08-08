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

/**
 * Formats a number with en-US grouping (e.g. 12,847).
 *
 * The single source of truth for number formatting — components must never
 * call `toLocaleString()` directly, because the runtime default locale makes
 * output non-deterministic between the server and a non-en-US browser.
 */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return value.toLocaleString('en-US', options);
}

/** Formats an ISO date as a short human date (e.g. Jun 1, 2023). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Formats a time of day with a fixed locale (e.g. "5:32 PM") — tooltips/labels.
 */
export function formatTime(iso: string | Date | null | undefined): string {
  const date = toDate(iso);
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Formats a full date + time with a fixed locale (e.g. "Aug 8, 2026, 6:32 PM")
 * — audit-style timestamps and tooltips.
 */
export function formatDateTime(iso: string | Date | null | undefined): string {
  const date = toDate(iso);
  if (!date) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
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
