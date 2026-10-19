import { useMemo, useState } from 'react';
import { useApp } from '../state/store';
import { Badge, ChartCard, Collapsible, Empty, Notice, PageTitle, Tabs } from '../components/ui';
import { HBar, StackedBar } from '../components/charts';
import { Heatmap } from '../components/Heatmap';
import { DataTable, type Col } from '../components/DataTable';
import { crossMatrix, facetStats, overlapCounts, tally, type FacetStat } from '../lib/aggregate';
import { NormalizationPanel, OrgTable, distToString, useFacetExport, useLabeler } from './shared';
import type { FacetField } from '../lib/types';

type F = 'technologies' | 'topics';

/** Shared implementation of the Technologies and Topics pages. */
export default function FacetExplorer({ field }: { field: F }) {
  const { records, facets, filters, toggle, setOnly, setMode, patch, mapping, built } = useApp();
  const lab = useLabeler();
  const exportStats = useFacetExport();
  const isTech = field === 'technologies';
  const noun = isTech ? 'Technology' : 'Topic';
  const nounPl = isTech ? 'technologies' : 'topics';
  const sourceCol = isTech ? mapping.technologies : mapping.topics;
  const other: F = isTech ? 'topics' : 'technologies';
  const selected = filters[field];
  const mode = filters.modes[field];

  const [q, setQ] = useState('');
  const [minOrgs, setMinOrgs] = useState(1);
  const [heatCols, setHeatCols] = useState<'other' | 'categories'>('other');

  const stats = useMemo(() => facetStats(facets[field], field), [facets, field]);
  const statByKey = useMemo(() => new Map(stats.map((s) => [s.key, s])), [stats]);
  const shownStats = useMemo(() => {
    const t = q.trim().toLowerCase();
    return stats.filter((s) => s.orgs >= minOrgs && (!t || lab(field, s.key).toLowerCase().includes(t) || s.key.includes(t)));
  }, [stats, q, minOrgs, field]); // eslint-disable-line react-hooks/exhaustive-deps

  const sharedCount = stats.filter((s) => s.orgs >= 2).length;
  const singleCount = stats.filter((s) => s.orgs === 1).length;

  const cols: Col<FacetStat>[] = [
    {
      id: 'name',
      header: noun,
      sort: (s) => lab(field, s.key).toLowerCase(),
      render: (s) => (
        <button className={`text-left font-medium hover:underline ${selected.includes(s.key) ? 'text-blue-700 dark:text-blue-300' : ''}`} onClick={() => toggle(field, s.key)} aria-pressed={selected.includes(s.key)} title={`Original spellings: ${[...(built.variants[field].get(s.key)?.keys() ?? [])].join(', ')}`}>
          {selected.includes(s.key) ? '✓ ' : ''}
          {lab(field, s.key)}
        </button>
      ),
    },
    { id: 'orgs', header: 'Organizations', sort: (s) => s.orgs, render: (s) => s.orgs, className: 'tabular-nums' },
    { id: 'pct', header: '% of orgs', sort: (s) => s.pct, render: (s) => `${s.pct.toFixed(1)}%`, className: 'tabular-nums' },
    { id: 'cats', header: 'Category distribution', render: (s) => (s.categories.length ? distToString(s.categories, (k) => k, 3) : '—'), className: 'text-xs' },
    { id: 'other', header: isTech ? 'Top topics' : 'Top technologies', render: (s) => distToString(s[other], (k) => lab(other, k), 3) || '—', className: 'text-xs' },
  ];

  // ----- selection analysis -----
  const selStats = selected.map((k) => statByKey.get(k)).filter(Boolean) as FacetStat[];
  const compareData = selStats.map((s) => ({ key: s.key, label: lab(field, s.key), value: s.orgs }));
  const overlap = useMemo(() => overlapCounts(facets[field], field, selected), [facets, field, selected]);
  const multi = useMemo(() => {
    const set = new Set(selected);
    return records.filter((r) => r[field].filter((k) => set.has(k)).length >= 2);
  }, [records, field, selected]);

  const catStack = useMemo(() => {
    const cats = [...new Set(selStats.flatMap((s) => s.categories.map((c) => c.key)))];
    const rows = selStats.map((s) => {
      const row: Record<string, string | number> = { label: lab(field, s.key) };
      cats.forEach((c) => (row[c] = s.categories.find((x) => x.key === c)?.count ?? 0));
      return row;
    });
    return { rows, cats };
  }, [selStats]); // eslint-disable-line react-hooks/exhaustive-deps

  const otherDist = tally(records, other).slice(0, 15).map((t) => ({ key: t.key, label: lab(other, t.key), value: t.count }));
  const catDist = tally(records, 'categories').map((t) => ({ key: t.key, label: t.key, value: t.count }));

  // ----- heatmap -----
  const heat = useMemo(() => {
    const rowsK = tally(records, field).slice(0, 12).map((t) => t.key);
    const colField: FacetField = heatCols === 'other' ? other : 'categories';
    const colsK = tally(records, colField).slice(0, 12).map((t) => t.key);
    return { rowsK, colsK, colField, m: crossMatrix(records, field, colField, rowsK, colsK) };
  }, [records, field, other, heatCols]);

  const exportRows = () => exportStats(field, stats, `${nounPl}-statistics`);

  return (
    <div>
      <PageTitle title={`${noun} analysis`} subtitle={`Search, select and compare ${nounPl}. Selections become global filters, so every chart, KPI and table stays consistent.`}>
        <button className="btn" onClick={exportRows} disabled={!stats.length}>Export {nounPl} stats</button>
      </PageTitle>

      {!sourceCol ? (
        <Notice kind="warn" title={`No ${noun} column`}>The CSV has no column that could be mapped to {nounPl}, so this analysis is unavailable. Check the mapping on the Data Quality page.</Notice>
      ) : (
        <div className="space-y-4">
          <Notice title={`Source: the “${sourceCol}” column`}>
            Each cell is a list; every item is trimmed and lower-cased (originals are kept and shown on hover and below). A value counts for an organization only if it is listed in that organization’s own “{sourceCol}” cell
            — nothing is inferred from other fields.
          </Notice>

          <section className="card p-3" aria-label={`${noun} list`}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <input className="input max-w-xs" placeholder={`Search ${nounPl}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${nounPl}`} />
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                Shared by at least
                <input type="number" min={1} className="input w-16 py-1" value={minOrgs} onChange={(e) => setMinOrgs(Math.max(1, Number(e.target.value) || 1))} aria-label="Minimum organizations" />
                organizations
              </label>
              <span className="text-xs text-slate-500">
                {stats.length} {nounPl} · {sharedCount} shared by 2+ organizations · {singleCount} listed by only one
              </span>
            </div>
            <DataTable rows={shownStats} cols={cols} rowKey={(s) => s.key} pageSize={12} initialSort={{ id: 'orgs', dir: 'desc' }} caption={`${noun} statistics`} />
          </section>

          <section className="card p-3" aria-label="Selection">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                {selected.length ? `Selected ${nounPl}: ${selected.map((k) => lab(field, k)).join(mode === 'AND' ? ' AND ' : ' OR ')}` : `Select ${nounPl} above to compare them`}
              </h2>
              <div className="flex items-center gap-2">
                {selected.length > 1 && <Tabs value={mode} onChange={(m) => setMode(field, m)} items={[{ id: 'OR', label: 'Any (OR)' }, { id: 'AND', label: 'All (AND)' }]} />}
                {selected.length > 0 && <button className="btn" onClick={() => setOnly(field, [])}>Clear</button>}
              </div>
            </div>

            {!selected.length ? (
              <Empty>Click one or more names in the table (or use the filter bar). You’ll see matching organizations, overlaps, category and {isTech ? 'topic' : 'technology'} distributions.</Empty>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <ChartCard title={`Compare selected ${nounPl}`} subtitle="Organizations listing each value (other filters applied)" exportName={`compare-${nounPl}`} exportRows={compareData.map((d) => ({ [noun]: d.label, Organizations: d.value }))}>
                    <HBar data={compareData} />
                  </ChartCard>
                  <ChartCard title="Category distribution" subtitle="Organizations per category for each selected value" exportName={`${nounPl}-by-category`} exportRows={catStack.rows}>
                    {catStack.cats.length ? <StackedBar rows={catStack.rows} seriesKeys={catStack.cats} seriesLabels={{}} height={240} /> : <Empty>No categories for these organizations.</Empty>}
                  </ChartCard>
                </div>

                {selected.length > 1 && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartCard title="Overlap between selected values" subtitle={`Computed on organizations passing all other filters: ${overlap.any} list at least one, ${overlap.all} list all ${selected.length}.`}>
                      <DataTable
                        rows={overlap.pairs}
                        cols={[
                          { id: 'a', header: 'A', render: (p) => lab(field, p.a) },
                          { id: 'b', header: 'B', render: (p) => lab(field, p.b) },
                          { id: 'both', header: 'Orgs with both', sort: (p) => p.both, render: (p) => p.both, className: 'tabular-nums' },
                          { id: 'j', header: 'Jaccard', sort: (p) => p.jaccard, render: (p) => p.jaccard.toFixed(2), className: 'tabular-nums' },
                        ]}
                        rowKey={(p) => `${p.a}|${p.b}`}
                        pageSize={8}
                        initialSort={{ id: 'both', dir: 'desc' }}
                      />
                    </ChartCard>
                    <ChartCard title={`Organizations overlapping ≥2 selected ${nounPl}`} subtitle={`${multi.length} organization${multi.length === 1 ? '' : 's'}`}>
                      {multi.length ? <OrgTable records={multi} compact pageSize={6} exportName={`overlap-${nounPl}`} /> : <Empty>No organization lists two or more of the selected values.</Empty>}
                    </ChartCard>
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <ChartCard title={isTech ? 'Topics associated with selection' : 'Technologies used with selection'} subtitle="Among matching organizations" exportName={`selection-${other}`} exportRows={tally(records, other).map((t) => ({ [isTech ? 'Topic' : 'Technology']: lab(other, t.key), Organizations: t.count }))}>
                    <HBar data={otherDist} />
                  </ChartCard>
                  <ChartCard title="Categories of matching organizations" exportName="selection-categories" exportRows={catDist.map((d) => ({ Category: d.label, Organizations: d.value }))}>
                    {catDist.length ? <HBar data={catDist} /> : <Empty>No categories defined.</Empty>}
                  </ChartCard>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Matching organizations ({records.length})</h3>
                  <OrgTable records={records} exportName={`${nounPl}-${selected.join('+')}`} />
                </div>
              </div>
            )}
          </section>

          <ChartCard
            title={`${noun} × ${heatCols === 'other' ? (isTech ? 'topic' : 'technology') : 'category'} matrix`}
            subtitle="Colour intensity = number of organizations having both. Top 12 × top 12 of the current filter. Click a cell to filter by both."
            exportName={`${nounPl}-matrix`}
            exportRows={heat.rowsK.flatMap((r, i) => heat.colsK.map((c, j) => ({ [noun]: lab(field, r), [heatCols === 'other' ? (isTech ? 'Topic' : 'Technology') : 'Category']: lab(heat.colField, c), Organizations: heat.m[i][j] })))}
          >
            <div className="mb-2">
              <Tabs value={heatCols} onChange={setHeatCols} items={[{ id: 'other', label: isTech ? 'Topics' : 'Technologies' }, ...(built.categorySource !== 'none' ? [{ id: 'categories' as const, label: 'Categories' }] : [])]} />
            </div>
            <Heatmap
              rows={heat.rowsK.map((k) => ({ key: k, label: lab(field, k) }))}
              cols={heat.colsK.map((k) => ({ key: k, label: lab(heat.colField, k) }))}
              matrix={heat.m}
              rowName={noun}
              colName={heatCols === 'other' ? (isTech ? 'Topic' : 'Technology') : 'Category'}
              onCell={(r, c) => {
                patch({ [field]: Array.from(new Set([...filters[field], r])), [heat.colField]: Array.from(new Set([...filters[heat.colField as FacetField], c])) } as never);
              }}
            />
          </ChartCard>

          <Collapsible title={<>Inspect & normalise {nounPl} <Badge>nothing is merged unless you accept it</Badge></>}>
            <NormalizationPanel field={field} />
          </Collapsible>
        </div>
      )}
    </div>
  );
}
