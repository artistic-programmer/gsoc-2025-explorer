import Papa from 'papaparse';

/** Convert rows to CSV text. Cells starting with = + - @ are escaped to avoid spreadsheet formula injection. */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const fields = columns ?? (rows.length ? Object.keys(rows[0]) : []);
  const data = rows.map((r) => fields.map((f) => normalizeCell(r[f])));
  return Papa.unparse({ fields, data }, { escapeFormulae: true });
}

function normalizeCell(v: unknown): string | number {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join('; ');
  if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v * 100) / 100;
  return String(v);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[], columns?: string[]) {
  const text = '﻿' + toCsv(rows, columns);
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
