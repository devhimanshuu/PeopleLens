'use client';

import type { ImportHistoryView, ImportRowError, Paginated } from '@peoplelens/types';
import {
  CheckCircle2,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { PageHeader } from '@/components/app-shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { useToast } from '@/components/ui/toast';
import { api, ApiClientError, downloadAuthenticated } from '@/lib/api';
import { formatDate, formatDuration, formatNumber, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function ImportsPage() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportHistoryView | null>(null);
  const [history, setHistory] = useState<Paginated<ImportHistoryView> | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await api.get<Paginated<ImportHistoryView>>('/imports?page=1&pageSize=10'));
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to load import history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const uploadFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please choose a CSV file');
      return;
    }
    setUploading(true);
    setResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      // The API client attaches the Neon session token and refreshes on 401,
      // so uploads never silently fail on an expired session.
      const imported = await api.post<ImportHistoryView>('/imports', form);
      setResult(imported);
      toast.success(
        `Imported ${imported.successCount} employee${imported.successCount === 1 ? '' : 's'}`,
      );
      await loadHistory();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = useCallback(async () => {
    try {
      // The template endpoint is auth-protected, so it must be fetched with
      // the session token and saved as a blob — a plain <a href> would 401.
      await downloadAuthenticated('/imports/template', 'peoplelens-employees-template.csv');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to download template');
    }
  }, [toast]);

  const downloadHiringTemplate = useCallback(async () => {
    try {
      await downloadAuthenticated('/imports/template/hiring', 'peoplelens-hiring-template.csv');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to download template');
    }
  }, [toast]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Onboarding"
        title="CSV Import"
        description="Bulk-import employees from a CSV file. Rows are validated; a per-row error report is returned."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void downloadTemplate()}>
              <Download className="size-4" aria-hidden /> Employee Template
            </Button>
            <Button variant="outline" onClick={() => void downloadHiringTemplate()}>
              <Download className="size-4" aria-hidden /> Hiring Template
            </Button>
          </div>
        }
      />

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => void handleDrop(e)}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        aria-label="Upload a CSV file"
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-10',
          dragging
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-border bg-card/50 hover:border-indigo-500/50 hover:bg-card',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            e.target.value = '';
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="size-8 animate-spin text-indigo-500" aria-hidden />
            <p className="text-sm font-medium text-foreground">Importing employees…</p>
            <p className="text-xs text-muted-foreground">
              Validating rows, checking duplicates, and creating profiles.
            </p>
          </>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-cyan-500/15">
              <CloudUpload className="size-6 text-indigo-500 dark:text-indigo-300" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Drop your CSV here, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Expected columns: employeeCode, firstName, lastName, email, jobTitle, gender,
                hiredAt, department… (see template) · a CSV with a requisitionId column is
                auto-detected as hiring-pipeline data
              </p>
            </div>
          </>
        )}
      </div>

      {/* Import summary */}
      {result ? (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard
            label="Total rows"
            value={formatNumber(result.totalRows)}
            tone="text-foreground"
          />
          <SummaryCard
            label="Imported"
            value={formatNumber(result.successCount)}
            tone="text-emerald-500"
            icon={<CheckCircle2 className="size-4 text-emerald-500" aria-hidden />}
          />
          <SummaryCard
            label="Duplicates"
            value={formatNumber(result.duplicateCount)}
            tone="text-amber-500"
          />
          <SummaryCard
            label="Failed"
            value={formatNumber(result.failedCount)}
            tone="text-rose-500"
            icon={<XCircle className="size-4 text-rose-500" aria-hidden />}
          />
        </div>
      ) : null}

      {/* Error report */}
      {result?.errorReport && result.errorReport.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Error Report</CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorReportTable report={result.errorReport} />
          </CardContent>
        </Card>
      ) : null}

      {/* Import history */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Import History
        </h2>
        <Card className="mt-3">
          <CardContent className="p-0">
            {historyLoading ? (
              <TableSkeleton rows={4} toolbar={false} />
            ) : historyError ? (
              <ErrorState description={historyError} onRetry={() => void loadHistory()} />
            ) : history && history.items.length === 0 ? (
              <EmptyState
                title="No imports yet"
                description="Your CSV imports will appear here with their results."
                action={
                  <Button size="sm" onClick={() => inputRef.current?.click()}>
                    <CloudUpload className="size-4" aria-hidden /> Upload your first CSV
                  </Button>
                }
              />
            ) : history ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Imported</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Duplicates</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="hidden lg:table-cell">By</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden />
                          {item.fileName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'completed'
                              ? 'success'
                              : item.status === 'partial'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatNumber(item.totalRows)}
                      </TableCell>
                      <TableCell className="text-sm text-emerald-500">
                        {item.successCount}
                      </TableCell>
                      <TableCell className="text-sm text-rose-500">{item.failedCount}</TableCell>
                      <TableCell className="text-sm text-amber-500">
                        {item.duplicateCount}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDuration(item.durationMs)}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {item.importedBy?.name ?? '—'}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground"
                        title={formatDate(item.createdAt)}
                      >
                        {formatRelative(item.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={cn('mt-1 flex items-center gap-1.5 font-display text-2xl font-semibold', tone)}
        >
          {icon}
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function ErrorReportTable({ report }: { report: ImportRowError[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Row</TableHead>
          <TableHead>Employee</TableHead>
          <TableHead>Errors</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.map((row, index) => (
          <TableRow key={index}>
            <TableCell className="font-mono text-xs text-muted-foreground">{row.row}</TableCell>
            <TableCell className="text-sm text-foreground">
              {row.employeeCode ?? row.email ?? '—'}
            </TableCell>
            <TableCell>
              <ul className="space-y-1">
                {row.errors.map((message, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-rose-500">
                    <XCircle className="mt-0.5 size-3 shrink-0" aria-hidden />
                    {message}
                  </li>
                ))}
              </ul>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
