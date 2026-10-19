import { Empty } from './ui';
import { useApp } from '../state/store';

export interface HeatAxis {
  key: string;
  label: string;
}

/** Matrix where colour intensity = number of matching organizations. Click a cell to filter by both axes. */
export function Heatmap({
  rows,
  cols,
  matrix,
  rowName,
  colName,
  onCell,
}: {
  rows: HeatAxis[];
  cols: HeatAxis[];
  matrix: number[][];
  rowName: string;
  colName: string;
  onCell?: (rowKey: string, colKey: string) => void;
}) {
  const { theme } = useApp();
  const max = Math.max(0, ...matrix.flat());
  if (!rows.length || !cols.length || max === 0) return <Empty>No overlapping data for the current filters.</Empty>;
  const base = theme === 'dark' ? '96,165,250' : '37,99,235';
  const shade = (v: number) => (v === 0 ? 'transparent' : `rgba(${base}, ${0.12 + (v / max) * 0.88})`);
  return (
    <div>
      <div className="overflow-auto">
        <table className="border-separate border-spacing-0.5 text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white p-1 text-left font-normal text-slate-400 dark:bg-slate-900">
                {rowName} ↓ / {colName} →
              </th>
              {cols.map((c) => (
                <th key={c.key} className="h-28 w-8 align-bottom font-normal text-slate-500" title={c.label}>
                  <div className="mx-auto whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 108 }}>
                    {c.label.length > 18 ? c.label.slice(0, 17) + '…' : c.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key}>
                <th className="sticky left-0 max-w-[150px] truncate bg-white py-0.5 pr-2 text-left font-normal text-slate-600 dark:bg-slate-900 dark:text-slate-300" title={r.label}>
                  {r.label}
                </th>
                {cols.map((c, j) => {
                  const v = matrix[i][j];
                  const strong = v / max > 0.55;
                  return (
                    <td key={c.key} className="p-0">
                      <button
                        className={`flex h-7 w-8 items-center justify-center rounded-sm tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${strong ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}
                        style={{ background: shade(v), outline: v === 0 ? '1px solid rgba(148,163,184,0.25)' : undefined }}
                        title={`${r.label} × ${c.label}: ${v} organization${v === 1 ? '' : 's'}`}
                        aria-label={`${r.label} and ${c.label}: ${v} organizations`}
                        onClick={() => onCell?.(r.key, c.key)}
                        disabled={!onCell}
                      >
                        {v || ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
        <span>0</span>
        <span className="h-2 w-32 rounded" style={{ background: `linear-gradient(to right, rgba(${base},0.12), rgba(${base},1))` }} />
        <span>{max} organizations</span>
      </div>
    </div>
  );
}
