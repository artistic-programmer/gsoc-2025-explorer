import { useMemo, useState } from 'react';
import { ExternalLink, Plus, Trash2, Undo2 } from 'lucide-react';
import { useApp } from '../state/store';
import { DataTable, type Col } from '../components/DataTable';
import { Chips } from '../components/Chips';
import { Badge, Notice } from '../components/ui';
import { downloadCsv } from '../lib/export';
import { newRuleId, starterRules } from '../lib/categories';
import { suggestMerges } from '../lib/normalize';
import type { CategoryRule, FacetField, OrgRecord } from '../lib/types';
import type { FacetStat, TallyRow } from '../lib/aggregate';

export const safeHref = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : undefined);

export function useLabeler() {
  const { techLabel, topicLabel } = useApp();
  return (field: FacetField | 'categories', key: string) => (field === 'technologies' || field === 'languages' ? techLabel(key) : field === 'topics' ? topicLabel(key) : key);
}

export function distToString(rows: TallyRow[], label: (k: string) => string, n = 10) {
  return rows.slice(0, n).map((r) => `${label(r.key)}: ${r.count}`).join('; ');
}

export function useOrgExportRows() {
  const { techLabel, topicLabel, mapping } = useApp();
  return (records: OrgRecord[]) =>
    records.map((r) => {
      const row: Record<string, unknown> = {
        Organization: r.name,
        'GSoC URL': r.url ?? '',
        'Ideas Link': r.ideasLink ?? '',
        Categories: r.categories,
        Technologies: r.technologies.map(techLabel),
        Topics: r.topics.map(topicLabel),
        'Programming languages (from list)': r.languages.map(techLabel),
        'Short Description': r.description ?? '',
      };
      mapping.metrics.forEach((m) => (row[m] = r.metrics[m] ?? ''));
      return row;
    });
}

export function useFacetExport() {
  const { filters } = useApp();
  const lab = useLabeler();
  return (field: 'technologies' | 'topics' | 'categories', stats: FacetStat[], filename: string) => {
    const nameCol = field === 'technologies' ? 'Technology' : field === 'topics' ? 'Topic' : 'Category';
    const rows = stats.map((s) => ({
      [nameCol]: lab(field, s.key),
      Organizations: s.orgs,
      'Share of organizations (%)': Math.round(s.pct * 10) / 10,
      'Category distribution': distToString(s.categories, (k) => k),
      'Top technologies': distToString(s.technologies, (k) => lab('technologies', k)),
      'Top topics': distToString(s.topics, (k) => lab('topics', k)),
      'Source field': field === 'categories' ? 'category rules / column' : field === 'technologies' ? 'Technologies column' : 'Topics column',
    }));
    const active = filters.search || filters.categories.length || filters.technologies.length || filters.topics.length || filters.languages.length || filters.organizations.length;
    downloadCsv(`${filename}${active ? '-filtered' : ''}`, rows);
  };
}

export function OrgTable({
  records,
  pageSize = 15,
  exportName = 'organizations-filtered',
  showExport = true,
  compact = false,
}: {
  records: OrgRecord[];
  pageSize?: number;
  exportName?: string;
  showExport?: boolean;
  compact?: boolean;
}) {
  const { openRecord, mapping } = useApp();
  const exportRows = useOrgExportRows();
  const cols: Col<OrgRecord>[] = useMemo(() => {
    const base: Col<OrgRecord>[] = [
      {
        id: 'name',
        header: 'Organization',
        sort: (r) => r.name.toLowerCase(),
        render: (r) => (
          <button className="text-left font-medium text-blue-700 hover:underline dark:text-blue-300" onClick={(e) => { e.stopPropagation(); openRecord(r.id); }}>
            {r.name}
          </button>
        ),
      },
    ];
    if (!compact)
      base.push({ id: 'cats', header: 'Categories', render: (r) => <Chips field="categories" keys={r.categories} max={3} />, className: 'min-w-[140px]' });
    base.push(
      { id: 'tech', header: 'Technologies', sort: (r) => r.technologies.length, render: (r) => <Chips field="technologies" keys={r.technologies} max={compact ? 3 : 5} />, className: 'min-w-[180px]' },
      { id: 'topics', header: 'Topics', sort: (r) => r.topics.length, render: (r) => <Chips field="topics" keys={r.topics} max={compact ? 3 : 5} />, className: 'min-w-[180px]' },
    );
    mapping.metrics.forEach((m) => base.push({ id: `m-${m}`, header: m, sort: (r) => r.metrics[m] ?? -1, render: (r) => (r.metrics[m] ?? '—').toLocaleString?.() ?? '—', className: 'tabular-nums' }));
    base.push({
      id: 'links',
      header: 'Links',
      render: (r) => (
        <div className="flex gap-2 text-xs">
          {safeHref(r.url) && (
            <a className="inline-flex items-center gap-0.5 text-blue-700 hover:underline dark:text-blue-300" href={r.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              GSoC <ExternalLink size={10} />
            </a>
          )}
          {safeHref(r.ideasLink) && (
            <a className="inline-flex items-center gap-0.5 text-blue-700 hover:underline dark:text-blue-300" href={r.ideasLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              Ideas <ExternalLink size={10} />
            </a>
          )}
        </div>
      ),
    });
    return base;
  }, [mapping.metrics, openRecord, compact]);

  return (
    <DataTable
      rows={records}
      cols={cols}
      rowKey={(r) => r.id}
      pageSize={pageSize}
      onRowClick={(r) => openRecord(r.id)}
      initialSort={{ id: 'name', dir: 'asc' }}
      searchText={(r) => `${r.name} ${r.description ?? ''} ${r.technologies.join(' ')} ${r.topics.join(' ')} ${r.categories.join(' ')}`}
      onExport={showExport ? () => downloadCsv(exportName, exportRows(records)) : undefined}
      caption="Organizations"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Normalization inspector: nothing is merged unless you accept it.    */
/* ------------------------------------------------------------------ */
export function NormalizationPanel({ field }: { field: 'technologies' | 'topics' }) {
  const { built, normRules, setNormRules, allRecords } = useApp();
  const rules = normRules[field];
  const variants = built.variants[field];
  const labels = built.labels[field];
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const update = (r: typeof rules) => setNormRules({ ...normRules, [field]: r });
  const keys = useMemo(() => [...variants.keys()].sort(), [variants]);
  const suggestions = useMemo(() => suggestMerges(keys).filter((s) => !s.keys.slice(1).every((k) => rules.merges[k] === s.keys[0])), [keys, rules.merges]);
  const spelled = useMemo(() => [...variants.entries()].filter(([, v]) => v.size > 1), [variants]);
  const compounds = useMemo(() => keys.filter((k) => k.includes('/') && !rules.splits[k]), [keys, rules.splits]);
  const found = q.trim() ? [...variants.entries()].filter(([k]) => k.includes(q.trim().toLowerCase())).slice(0, 12) : [];
  void allRecords;

  const nMerges = Object.keys(rules.merges).length;
  const nSplits = Object.keys(rules.splits).length;
  return (
    <div className="space-y-4 text-sm">
      <Notice title="How names are normalised">
        Automatically: Unicode normalisation, trim, collapse spaces, lower-case (so “AI” and “ai” count as one; display uses the most common original spelling). Merges and splits below are
        applied only after you accept them, and can be undone at any time. Original CSV values are never modified.
      </Notice>

      <div>
        <h4 className="mb-1 font-medium">Inspect original values</h4>
        <input className="input max-w-xs" placeholder="Type part of a name…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Inspect original values" />
        {found.length > 0 && (
          <ul className="mt-2 space-y-1">
            {found.map(([k, v]) => (
              <li key={k} className="text-xs">
                <span className="font-medium">{labels.get(k) ?? k}</span> ← {[...v.entries()].map(([s, c]) => `“${s}” ×${c}`).join(', ')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={rules.splitSlash} onChange={(e) => update({ ...rules, splitSlash: e.target.checked })} />
          <span>Split <em>every</em> value containing “/” into parts (off by default — “CI/CD” and “UI/UX” would break)</span>
        </label>
      </div>

      <div>
        <h4 className="mb-1 font-medium">Spelling variants merged by case ({spelled.length})</h4>
        {spelled.length ? (
          <p className="text-xs text-slate-500">
            {spelled.slice(0, 30).map(([k, v]) => `${[...v.keys()].join(' / ')}`).join(' · ')}
            {spelled.length > 30 && ' …'}
          </p>
        ) : (
          <p className="text-xs text-slate-400">None.</p>
        )}
      </div>

      <div>
        <h4 className="mb-1 font-medium">Suggested merges (not applied)</h4>
        {suggestions.length ? (
          <ul className="space-y-1">
            {suggestions.map((s) => (
              <li key={s.keys.join('|')} className="flex flex-wrap items-center gap-2 text-xs">
                <span>{s.keys.map((k) => `“${labels.get(k) ?? k}”`).join(' + ')}</span>
                <span className="text-slate-400">({s.reason})</span>
                <button
                  className="btn py-0.5"
                  onClick={() => {
                    const target = s.keys.slice().sort((a, b) => (variants.get(b)?.size ?? 0) - (variants.get(a)?.size ?? 0))[0];
                    const merges = { ...rules.merges };
                    s.keys.forEach((k) => k !== target && (merges[k] = target));
                    update({ ...rules, merges });
                  }}
                >
                  Accept merge
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">No suggestions.</p>
        )}
      </div>

      {compounds.length > 0 && (
        <div>
          <h4 className="mb-1 font-medium">Compound values containing “/”</h4>
          <ul className="flex flex-wrap gap-2">
            {compounds.map((k) => (
              <li key={k} className="flex items-center gap-1 text-xs">
                <span className="chip">{labels.get(k) ?? k}</span>
                <button className="btn py-0.5" onClick={() => update({ ...rules, splits: { ...rules.splits, [k]: k.split('/').map((s) => s.trim()).filter(Boolean) } })}>
                  Split
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="mb-1 font-medium">Manual merge</h4>
        <div className="flex flex-wrap items-center gap-2">
          <input className="input w-44" placeholder="value (e.g. ai)" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Merge from" />
          <span>→</span>
          <input className="input w-44" placeholder="count as (e.g. artificial intelligence)" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Merge into" />
          <button
            className="btn"
            disabled={!from.trim() || !to.trim()}
            onClick={() => {
              update({ ...rules, merges: { ...rules.merges, [from.trim().toLowerCase()]: to.trim().toLowerCase() } });
              setFrom('');
              setTo('');
            }}
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {(nMerges > 0 || nSplits > 0) && (
        <div>
          <h4 className="mb-1 font-medium">Active rules</h4>
          <ul className="space-y-1 text-xs">
            {Object.entries(rules.merges).map(([k, v]) => (
              <li key={`m-${k}`} className="flex items-center gap-2">
                <span>merge “{k}” → “{v}”</span>
                <button className="btn py-0.5" onClick={() => { const m = { ...rules.merges }; delete m[k]; update({ ...rules, merges: m }); }}>
                  <Undo2 size={11} /> Undo
                </button>
              </li>
            ))}
            {Object.entries(rules.splits).map(([k, v]) => (
              <li key={`s-${k}`} className="flex items-center gap-2">
                <span>split “{k}” → {v.map((x) => `“${x}”`).join(', ')}</span>
                <button className="btn py-0.5" onClick={() => { const s = { ...rules.splits }; delete s[k]; update({ ...rules, splits: s }); }}>
                  <Undo2 size={11} /> Undo
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category rules editor                                                */
/* ------------------------------------------------------------------ */
export function RulesEditor() {
  const { categoryRules, setCategoryRules, mapping, built } = useApp();
  const patchRule = (id: string, p: Partial<CategoryRule>) => setCategoryRules(categoryRules.map((r) => (r.id === id ? { ...r, ...p } : r)));
  return (
    <div className="space-y-3 text-sm">
      {mapping.category ? (
        <Notice title={`Categories come from the CSV column “${mapping.category}”`}>Rules below are ignored while a category column is mapped.</Notice>
      ) : (
        <Notice title="These rules are yours, not the CSV’s">
          The CSV has no category column, so categories are groupings defined by these rules. A rule assigns a category only when one of the organization’s own Technologies/Topics tags matches a keyword
          (exact tag match by default). A starter set is loaded so you can explore immediately — edit, delete or replace it. Open any organization to see exactly which tags triggered each category.
        </Notice>
      )}
      <div className="space-y-2">
        {categoryRules.map((r) => (
          <RuleRow key={r.id} rule={r} onChange={(p) => patchRule(r.id, p)} onDelete={() => setCategoryRules(categoryRules.filter((x) => x.id !== r.id))} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={() => setCategoryRules([...categoryRules, { id: newRuleId(), name: 'New category', field: 'both', match: 'exact', keywords: [] }])}>
          <Plus size={12} /> Add category rule
        </button>
        <button className="btn" onClick={() => setCategoryRules(starterRules())}>
          Reset to starter template
        </button>
        <button className="btn" onClick={() => setCategoryRules([])}>
          Clear all rules
        </button>
        <Badge>{built.records.filter((r) => r.categories.length === 0).length} organizations currently uncategorised</Badge>
      </div>
    </div>
  );
}

function RuleRow({ rule, onChange, onDelete }: { rule: CategoryRule; onChange: (p: Partial<CategoryRule>) => void; onDelete: () => void }) {
  const [name, setName] = useState(rule.name);
  const [kw, setKw] = useState(rule.keywords.join(', '));
  return (
    <div className="grid gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-800 md:grid-cols-[180px_130px_110px_1fr_auto]">
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => onChange({ name: name.trim() || rule.name })} aria-label="Category name" />
      <select className="input" value={rule.field} onChange={(e) => onChange({ field: e.target.value as CategoryRule['field'] })} aria-label="Field to match">
        <option value="both">Technologies + Topics</option>
        <option value="technologies">Technologies only</option>
        <option value="topics">Topics only</option>
      </select>
      <select className="input" value={rule.match} onChange={(e) => onChange({ match: e.target.value as CategoryRule['match'] })} aria-label="Match type">
        <option value="exact">Exact tag</option>
        <option value="contains">Tag contains</option>
      </select>
      <textarea className="input min-h-[34px] text-xs" rows={2} value={kw} onChange={(e) => setKw(e.target.value)} onBlur={() => onChange({ keywords: kw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) })} aria-label="Keywords, comma separated" placeholder="keywords, comma separated" />
      <button className="btn px-1.5 text-red-600" onClick={onDelete} aria-label={`Delete rule ${rule.name}`}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}
