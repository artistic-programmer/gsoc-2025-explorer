import { useState } from 'react';
import { useApp } from '../state/store';
import { Badge, Kpi, Notice, PageTitle } from '../components/ui';
import { DEFAULT_LANGUAGES } from '../lib/records';
import type { ColumnMapping } from '../lib/types';

const FIELDS: { key: Exclude<keyof ColumnMapping, 'metrics'>; label: string; use: string }[] = [
  { key: 'name', label: 'Organization name', use: 'Record identity (rows without it are not counted as valid)' },
  { key: 'url', label: 'Organization URL', use: 'Link to the GSoC organization page' },
  { key: 'ideasLink', label: 'Ideas / projects link', use: 'Link to the organization’s project ideas' },
  { key: 'technologies', label: 'Technologies', use: 'Technology analysis, language lookup' },
  { key: 'topics', label: 'Topics', use: 'Topic analysis' },
  { key: 'category', label: 'Category', use: 'Source categories (if absent: user-defined rules)' },
  { key: 'description', label: 'Description', use: 'Shown in tables, searched by global search' },
  { key: 'logo', label: 'Logo URL', use: 'Detail panel' },
];

export default function DataQuality() {
  const { dataset, quality, mapping, setMapping, built, loadDefault, languageList, setLanguageList, loading } = useApp();
  const [langText, setLangText] = useState<string | null>(null);
  if (!dataset || !quality) return <Notice kind="warn" title="No data loaded">Use “Upload CSV” in the header.</Notice>;

  const setField = (key: (typeof FIELDS)[number]['key'], v: string) => setMapping({ ...mapping, [key]: v || undefined });
  const missingRows = Object.entries(quality.missingByColumn);
  const lt = langText ?? languageList.join(', ');

  return (
    <div className="space-y-4">
      <PageTitle title="Data quality" subtitle={`File: ${dataset.fileName}`}>
        <button className="btn" onClick={() => void loadDefault()} disabled={loading}>Reload bundled CSV</button>
      </PageTitle>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Rows loaded" value={quality.rowsLoaded} />
        <Kpi label="Valid records" value={quality.validRecords} hint="rows with an organization name" />
        <Kpi label="Rows skipped" value={quality.rowsWithoutName} hint="no name" />
        <Kpi label="Duplicate names" value={quality.duplicateNames.length} hint="case-insensitive" />
        <Kpi label="Duplicate URLs" value={quality.duplicateUrls.length} />
        <Kpi label="Empty technologies / topics" value={`${quality.emptyTechnologies} / ${quality.emptyTopics}`} hint="records with an empty list" />
      </div>

      {quality.parseErrors.length > 0 && (
        <Notice kind="warn" title={`${quality.parseErrors.length} CSV parse warning(s)`}>
          <ul className="list-disc pl-4">{quality.parseErrors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}</ul>
        </Notice>
      )}
      {quality.duplicateNames.length > 0 && <Notice kind="warn" title="Duplicate organization names">{quality.duplicateNames.slice(0, 10).join(', ')}. Records are kept as separate rows (nothing is deleted).</Notice>}

      <section className="card p-3">
        <h2 className="mb-1 text-sm font-semibold">Column mapping</h2>
        <p className="mb-3 text-xs text-slate-500">How the CSV’s actual columns feed the app’s data model. Detected automatically from header names; change any of them if the guess is wrong.</p>
        <div className="grid gap-2 md:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="grid grid-cols-[140px_1fr] items-center gap-2 text-sm">
              <span>
                {f.label}
                <span className="block text-[11px] text-slate-400">{f.use}</span>
              </span>
              <select className="input" value={mapping[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
                <option value="">— not mapped —</option>
                {dataset.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-3 text-sm">
          <div className="mb-1">Numeric metric columns (stars, forks, contributors…)</div>
          <div className="flex flex-wrap gap-3">
            {dataset.headers.map((h) => (
              <label key={h} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={mapping.metrics.includes(h)} onChange={(e) => setMapping({ ...mapping, metrics: e.target.checked ? [...mapping.metrics, h] : mapping.metrics.filter((x) => x !== h) })} />
                {h}
              </label>
            ))}
          </div>
          {!mapping.metrics.length && <p className="mt-1 text-xs text-slate-500">None detected. Tick a column here to treat its numbers as a metric.</p>}
        </div>
      </section>

      <section className="card p-3">
        <h2 className="mb-2 text-sm font-semibold">Analyses that cannot be performed with this data</h2>
        <ul className="space-y-2">
          {quality.unavailable.map((u) => (
            <li key={u.feature} className="text-sm">
              <Badge tone="amber">unavailable</Badge> <strong>{u.feature}</strong>
              <div className="text-xs text-slate-500">{u.reason}</div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-3">
          <h2 className="mb-2 text-sm font-semibold">Missing values by column</h2>
          <table className="w-full text-sm">
            <tbody>
              {missingRows.map(([col, n]) => (
                <tr key={col} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-1">{col}</td>
                  <td className="py-1 text-right tabular-nums">{n === 0 ? <span className="text-emerald-600">complete</span> : `${n} empty`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card p-3">
          <h2 className="mb-2 text-sm font-semibold">Inconsistent formats detected</h2>
          <p className="text-xs text-slate-500">Case/spelling variants (counted together automatically): <strong>{quality.caseVariantTokens.length}</strong></p>
          <p className="mb-2 text-xs text-slate-500">{quality.caseVariantTokens.slice(0, 12).map((t) => t.variants.join('/')).join(' · ')}{quality.caseVariantTokens.length > 12 ? ' …' : ''}</p>
          <p className="text-xs text-slate-500">Compound values containing “/” (kept as one value unless you split them): <strong>{quality.slashTokens.length}</strong></p>
          <p className="text-xs text-slate-500">{quality.slashTokens.slice(0, 14).map((t) => t.token).join(' · ')}{quality.slashTokens.length > 14 ? ' …' : ''}</p>
          <p className="mt-2 text-xs text-slate-500">Multi-value cells are read as Python/JSON lists (e.g. <code>['a', 'b']</code>) or text delimited by <code>|</code>, <code>;</code> or <code>,</code>.</p>
        </section>
      </div>

      <section className="card p-3">
        <h2 className="mb-1 text-sm font-semibold">Programming-language list</h2>
        <p className="mb-2 text-xs text-slate-500">The language filter/chart marks Technologies tags that appear in this list ({built.records.filter((r) => r.languages.length).length} organizations match). It is a lookup you control — not a CSV column.</p>
        <textarea className="input min-h-[70px] text-xs" value={lt} onChange={(e) => setLangText(e.target.value)} aria-label="Language list, comma separated" />
        <div className="mt-2 flex gap-2">
          <button className="btn-primary" onClick={() => { setLanguageList(lt.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)); setLangText(null); }}>Save list</button>
          <button className="btn" onClick={() => { setLanguageList(DEFAULT_LANGUAGES); setLangText(null); }}>Reset to default</button>
        </div>
      </section>
    </div>
  );
}
