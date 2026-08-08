import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { CsvEmployeeRow, ImportRowError } from '@peoplelens/types';

/** Expected CSV header row. */
export const CSV_HEADERS = [
  'employeeCode',
  'firstName',
  'lastName',
  'email',
  'phone',
  'jobTitle',
  'gender',
  'dateOfBirth',
  'hiredAt',
  'status',
  'department',
  'team',
  'managerEmail',
] as const;

export type CsvHeader = (typeof CSV_HEADERS)[number];

/**
 * Header aliases for columns that do not round-trip through whitespace/case
 * stripping. `Hire Date` → `hiredate` can never normalize to `hiredAt`, so
 * natural-language variants are mapped explicitly to the canonical key.
 */
const HEADER_ALIASES: Record<string, CsvHeader> = {
  hiredate: 'hiredAt',
  datehired: 'hiredAt',
  hiredon: 'hiredAt',
};

const GENDERS = ['female', 'male', 'non_binary', 'prefer_not_to_say'] as const;
const STATUSES = ['active', 'on_leave', 'probation', 'terminated'] as const;

/** One parsed + validated row. */
export interface ParsedRow {
  data: CsvEmployeeRow;
  rowNumber: number;
  errors: string[];
}

/** Outcome of parsing a CSV buffer. */
export interface ParseResult {
  rows: ParsedRow[];
  errorReport: ImportRowError[];
}

/**
 * Parses and row-validates a CSV buffer into normalized employee rows.
 *
 * Structural rules (header presence/columns) fail the whole import; per-row
 * rules (missing required fields, bad enums, malformed dates) are collected
 * into an error report so a single bad row never blocks a good file.
 */
@Injectable()
export class CsvService {
  parse(buffer: Buffer, originalName: string): ParseResult {
    let records: Record<string, unknown>[];
    try {
      records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
      }) as Record<string, unknown>[];
    } catch (error) {
      throw new BadRequestException(
        `Could not parse CSV "${originalName}": ${error instanceof Error ? error.message : 'malformed file'}`,
      );
    }

    if (records.length === 0) {
      throw new BadRequestException('The CSV file contains no data rows');
    }

    // Normalize keys to our canonical header names (case + whitespace tolerant).
    const rows: ParsedRow[] = records.map((raw, index) => {
      const row = this.normalizeRow(raw);
      return {
        data: row,
        rowNumber: index + 2, // 1-based including the header row
        errors: this.validateRow(row),
      };
    });

    const errorReport: ImportRowError[] = rows
      .filter((r) => r.errors.length > 0)
      .map((r) => ({
        row: r.rowNumber,
        employeeCode: r.data.employeeCode ?? null,
        email: r.data.email ?? null,
        errors: r.errors,
      }));

    return { rows, errorReport };
  }

  /** Builds the downloadable CSV template string. */
  buildTemplate(): string {
    const example: Record<CsvHeader, string> = {
      employeeCode: 'EMP-0101',
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'alex.morgan@company.com',
      phone: '+1 555 010 0101',
      jobTitle: 'Senior Engineer',
      gender: 'female',
      dateOfBirth: '1992-04-12',
      hiredAt: '2023-06-01',
      status: 'active',
      department: 'Engineering',
      team: 'Platform',
      managerEmail: 'taylor.lee@company.com',
    };
    const escape = (value: string) =>
      value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
    const header = CSV_HEADERS.join(',');
    const line = CSV_HEADERS.map((h) => escape(example[h])).join(',');
    return `${header}\n${line}\n`;
  }

  private normalizeRow(raw: Record<string, unknown>): CsvEmployeeRow {
    const get = (key: CsvHeader): string | undefined => {
      const found = Object.entries(raw).find(([k]) => {
        const normalized = k
          .trim()
          .toLowerCase()
          .replace(/[\s_-]/g, '');
        return normalized === key.toLowerCase() || HEADER_ALIASES[normalized] === key;
      });
      const value = found?.[1];
      if (value === undefined || value === null) return undefined;
      const str = String(value).trim();
      return str === '' ? undefined : str;
    };

    return {
      employeeCode: get('employeeCode'),
      firstName: get('firstName'),
      lastName: get('lastName'),
      email: get('email')?.toLowerCase(),
      phone: get('phone'),
      jobTitle: get('jobTitle'),
      gender: get('gender')?.toLowerCase(),
      dateOfBirth: get('dateOfBirth'),
      hiredAt: get('hiredAt'),
      status: get('status')?.toLowerCase(),
      department: get('department'),
      team: get('team'),
      managerEmail: get('managerEmail')?.toLowerCase(),
    };
  }

  private validateRow(row: CsvEmployeeRow): string[] {
    const errors: string[] = [];

    if (!row.employeeCode) errors.push('employeeCode is required');
    else if (!/^[A-Za-z0-9._-]{2,30}$/.test(row.employeeCode)) {
      errors.push(
        'employeeCode may only contain letters, numbers, dots, dashes and underscores (2–30 chars)',
      );
    }

    if (!row.firstName) errors.push('firstName is required');
    if (!row.lastName) errors.push('lastName is required');

    if (!row.email) {
      errors.push('email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push(`"${row.email}" is not a valid email`);
    }

    if (!row.jobTitle) errors.push('jobTitle is required');

    if (row.gender && !GENDERS.includes(row.gender as (typeof GENDERS)[number])) {
      errors.push(`gender must be one of: ${GENDERS.join(', ')}`);
    }
    if (row.status && !STATUSES.includes(row.status as (typeof STATUSES)[number])) {
      errors.push(`status must be one of: ${STATUSES.join(', ')}`);
    }

    if (row.dateOfBirth && Number.isNaN(Date.parse(row.dateOfBirth))) {
      errors.push(`dateOfBirth "${row.dateOfBirth}" is not a valid date (expected YYYY-MM-DD)`);
    }
    if (!row.hiredAt) {
      errors.push('hiredAt is required');
    } else if (Number.isNaN(Date.parse(row.hiredAt))) {
      errors.push(`hiredAt "${row.hiredAt}" is not a valid date (expected YYYY-MM-DD)`);
    }

    return errors;
  }
}
