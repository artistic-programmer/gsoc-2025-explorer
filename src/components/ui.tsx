import { useState, type ReactNode } from 'react';
import { AlertTriangle, Download, Info } from 'lucide-react';
import { useApp } from '../state/store';
import { downloadCsv } from '../lib/export';

export function useColors() {
  const { theme } = useApp();
  const dark = theme === 'dark';
  return {
    accent: dark ? '#60a5fa' : '#2563eb',
    soft: dark ? '#35609f' : '#9db9f2',
    grid: dark ? '#1e293b' : '#e2e8f0',
    axis: dark ? '#94a3b8' : '#64748b',
    palette: dark
      ? ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#22d3ee', '#f87171', '#a3e635', '#94a3b8', '#c084fc', '#fb923c']
      : ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#65a30d', '#64748b', '#9333ea', '#ea580c'],
  };
}

export const tooltipStyle = {
  background: 'var(--tt-bg)',
  border: '1px solid var(--tt-border)',
  color: 'var(--tt-fg)',
  borderRadius: 6,
  fontSize: 12,
  padding: '6px 10px',
};

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && <p className="mt-0.5 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card px-3 py-2.5" title={hint}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] leading-tight text-slate-400">{hint}</div>}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  exportName,
  exportRows,
  className = '',
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  exportName?: string;
  exportRows?: Record<string, unknown>[];
  className?: string;
}) {
  return (
    <section className={`card flex flex-col p-3 ${className}`} aria-label={title}>
      <header className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {exportName && exportRows && (
          <button
            className="btn shrink-0"
            onClick={() => downloadCsv(exportName, exportRows)}
            disabled={!exportRows.length}
            title="Download the data behind this chart (respects active filters)"
            aria-label={`Export ${title} as CSV`}
          >
            <Download size={13} /> CSV
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function Notice({ kind = 'info', title, children }: { kind?: 'info' | 'warn'; title?: string; children?: ReactNode }) {
  const warn = kind === 'warn';
  return (
    <div
      role={warn ? 'alert' : 'note'}
      className={`flex gap-2 rounded-md border px-3 py-2 text-sm ${
        warn
          ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200'
          : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
      }`}
    >
      {warn ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Info size={16} className="mt-0.5 shrink-0" />}
      <div>
        {title && <div className="font-medium">{title}</div>}
        {children && <div className="text-[13px] leading-snug opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'amber' | 'green' | 'blue' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  };
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

/** Shows where categories come from: the CSV, or user-defined rules. */
export function CategorySourceBadge() {
  const { built } = useApp();
  if (built.categorySource === 'csv') return <Badge tone="green">Categories: from CSV column</Badge>;
  if (built.categorySource === 'rules') return <Badge tone="amber">Categories: rule-based (user-defined, not in CSV)</Badge>;
  return <Badge>Categories: none defined</Badge>;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div role="tablist" className="inline-flex rounded-md border border-slate-300 p-0.5 dark:border-slate-700">
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={`rounded px-2.5 py-1 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
            value === it.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Collapsible({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="text-xs text-slate-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="border-t border-slate-200 p-3 dark:border-slate-800">{children}</div>}
    </div>
  );
}

export const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(d >= 1000 ? 1 : 0)}%` : '–');
