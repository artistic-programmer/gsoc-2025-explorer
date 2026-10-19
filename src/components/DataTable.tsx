import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { Empty } from './ui';

export interface Col<T> {
  id: string;
  header: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
  className?: string;
}

export function DataTable<T>({
  rows,
  cols,
  rowKey,
  pageSize = 15,
  onRowClick,
  initialSort,
  searchText,
  onExport,
  caption,
  empty = 'No rows match the current filters.',
}: {
  rows: T[];
  cols: Col<T>[];
  rowKey: (r: T) => string | number;
  pageSize?: number;
  onRowClick?: (r: T) => void;
  initialSort?: { id: string; dir: 'asc' | 'desc' };
  searchText?: (r: T) => string;
  onExport?: () => void;
  caption?: string;
  empty?: string;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    let out = rows;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length && searchText) out = out.filter((r) => terms.every((t) => searchText(r).toLowerCase().includes(t)));
    if (sort) {
      const col = cols.find((c) => c.id === sort.id);
      if (col?.sort) {
        const f = col.sort;
        const dir = sort.dir === 'asc' ? 1 : -1;
        out = [...out].sort((a, b) => {
          const x = f(a);
          const y = f(b);
          if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
          return String(x).localeCompare(String(y)) * dir;
        });
      }
    }
    return out;
  }, [rows, cols, sort, q, searchText]);

  useEffect(() => setPage(0), [rows, q, sort]);
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const slice = shown.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div>
      {(searchText || onExport) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {searchText ? (
            <label className="relative w-full max-w-xs">
              <Search size={14} className="absolute left-2 top-2.5 text-slate-400" />
              <input className="input pl-7" placeholder="Search this table…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search this table" />
            </label>
          ) : (
            <span />
          )}
          {onExport && (
            <button className="btn" onClick={onExport} disabled={!rows.length}>
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[560px] border-collapse">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              {cols.map((c) => {
                const active = sort?.id === c.id;
                return (
                  <th key={c.id} scope="col" className="th" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    {c.sort ? (
                      <button
                        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-900 dark:hover:text-white"
                        onClick={() => setSort(active ? { id: c.id, dir: sort!.dir === 'asc' ? 'desc' : 'asc' } : { id: c.id, dir: 'desc' })}
                      >
                        {c.header}
                        {active && (sort!.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {slice.map((r) => (
              <tr
                key={rowKey(r)}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''}
                onClick={() => onRowClick?.(r)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                    e.preventDefault();
                    onRowClick(r);
                  }
                }}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {cols.map((c) => (
                  <td key={c.id} className={`td ${c.className ?? ''}`}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!slice.length && <div className="p-4"><Empty>{empty}</Empty></div>}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>
          {shown.length ? `${page * pageSize + 1}–${Math.min(shown.length, (page + 1) * pageSize)} of ${shown.length}` : '0 rows'}
        </span>
        <div className="flex items-center gap-1">
          <button className="btn px-1.5" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft size={14} />
          </button>
          <span className="px-1">
            {page + 1} / {pages}
          </span>
          <button className="btn px-1.5" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
