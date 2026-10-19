import { useApp } from '../state/store';
import type { FacetField } from '../lib/types';

/** Clickable tag chips: clicking toggles that value in the global filter. */
export function Chips({
  field,
  keys,
  max = 8,
  onAfter,
}: {
  field: 'technologies' | 'topics' | 'categories';
  keys: string[];
  max?: number;
  onAfter?: () => void;
}) {
  const { techLabel, topicLabel, filters, toggle } = useApp();
  const label = (k: string) => (field === 'technologies' ? techLabel(k) : field === 'topics' ? topicLabel(k) : k);
  const on = new Set(filters[field as FacetField]);
  if (!keys.length) return <span className="text-xs text-slate-400">—</span>;
  const shown = keys.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((k) => (
        <button
          key={k}
          className={`chip hover:bg-blue-100 dark:hover:bg-blue-900/50 ${on.has(k) ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' : ''}`}
          title={`Toggle filter: ${label(k)}`}
          onClick={(e) => {
            e.stopPropagation();
            toggle(field as FacetField, k);
            onAfter?.();
          }}
        >
          {label(k)}
        </button>
      ))}
      {keys.length > max && <span className="chip" title={keys.slice(max).map(label).join(', ')}>+{keys.length - max}</span>}
    </div>
  );
}
