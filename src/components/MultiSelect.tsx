import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import type { MatchMode } from '../lib/types';

export interface Option {
  key: string;
  label: string;
  count?: number;
}

export function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear,
  mode,
  onMode,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onToggle: (key: string) => void;
  onClear: () => void;
  mode?: MatchMode;
  onMode?: (m: MatchMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
    return list.slice(0, 120);
  }, [options, q]);

  const sel = new Set(selected);
  return (
    <div ref={ref} className="relative">
      <button
        className={`btn ${selected.length ? 'border-blue-500 text-blue-700 dark:text-blue-300' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded bg-blue-600 px-1 text-[10px] text-white">
            {selected.length}
            {selected.length > 1 && mode ? ` ${mode === 'AND' ? 'all' : 'any'}` : ''}
          </span>
        )}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <input autoFocus className="input mb-2" placeholder={`Search ${label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${label}`} />
          {onMode && (
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">Multiple selections match:</span>
              <div className="inline-flex rounded border border-slate-300 p-0.5 dark:border-slate-700" role="group" aria-label="Match mode">
                {(['OR', 'AND'] as const).map((m) => (
                  <button key={m} onClick={() => onMode(m)} aria-pressed={mode === m} className={`rounded px-2 py-0.5 ${mode === m ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                    {m === 'OR' ? 'Any (OR)' : 'All (AND)'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ul role="listbox" aria-multiselectable className="max-h-64 overflow-auto">
            {filtered.map((o) => (
              <li key={o.key} role="option" aria-selected={sel.has(o.key)}>
                <button className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => onToggle(o.key)}>
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${sel.has(o.key) ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                    {sel.has(o.key) && <Check size={11} />}
                  </span>
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.count !== undefined && <span className="text-xs tabular-nums text-slate-400">{o.count}</span>}
                </button>
              </li>
            ))}
            {!filtered.length && <li className="px-2 py-3 text-center text-xs text-slate-400">No matches</li>}
          </ul>
          {options.length > 120 && !q && <div className="px-1 pt-1 text-[11px] text-slate-400">Showing top 120 — type to search all {options.length}.</div>}
          {selected.length > 0 && (
            <button className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400" onClick={onClear}>
              <X size={12} /> Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
