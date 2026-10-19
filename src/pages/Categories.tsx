import { useMemo } from 'react';
import { useApp } from '../state/store';
import { Badge, CategorySourceBadge, ChartCard, Collapsible, Empty, Notice, PageTitle, Tabs } from '../components/ui';
import { HBar, StackedBar, VBar } from '../components/charts';
import { DataTable, type Col } from '../components/DataTable';
import { facetStats, tally, type FacetStat } from '../lib/aggregate';
import { OrgTable, RulesEditor, distToString, useFacetExport } from './shared';

export default function Categories() {
  const { records, facets, filters, toggle, built, techLabel, topicLabel, setMode, setOnly, mapping } = useApp();
  const exportStats = useFacetExport();

  const stats = useMemo(() => facetStats(facets.categories, 'categories'), [facets.categories]);
  const selected = filters.categories;
  const mode = filters.modes.categories;

  const techDist = tally(records, 'technologies').slice(0, 15).map((t) => ({ key: t.key, label: techLabel(t.key), value: t.count }));
  const topicDist = tally(records, 'topics').slice(0, 15).map((t) => ({ key: t.key, label: topicLabel(t.key), value: t.count }));

  // Stacked comparison: the 8 most common technologies across all (facet-filtered) records, split by category.
  const stacked = useMemo(() => {
    const topTechs = tally(facets.categories, 'technologies').slice(0, 8).map((t) => t.key);
    const cats = stats.map((s) => s.key);
    const rows = cats.map((c) => {
      const row: Record<string, string | number> = { label: c };
      for (const t of topTechs) row[t] = 0;
      for (const r of facets.categories) if (r.categories.includes(c)) for (const t of r.technologies) if (topTechs.includes(t)) (row[t] as number)+1;
      return row;
    });
    return { rows, keys: topTechs, labels: Object.fromEntries(topTechs.map((t) => [t, techLabel(t)])) };
  }, [facets.categories, stats, techLabel]);

  const cols: Col<FacetStat>[] = [
    {
      id: 'cat',
      header: 'Category',
      sort: (s) => s.key.toLowerCase(),
      render: (s) => (
        <button className={`text-left font-medium hover:underline ${selected.includes(s.key) ? 'text-blue-700 dark:text-blue-300' : ''}`} onClick={() => toggle('categories', s.key)} aria-pressed={selected.includes(s.key)}>
          {selected.includes(s.key) ? '✓ ' : ''}
          {s.key}
        </button>
      ),
    },
    { id: 'orgs', header: 'Organizations', sort: (s) => s.orgs, render: (s) => s.orgs, className: 'tabular-nums' },
    { id: 'tech', header: 'Most common technologies', render: (s) => distToString(s.technologies, techLabel, 5), className: 'text-xs' },
    { id: 'topics', header: 'Most common topics', render: (s) => distToString(s.topics, topicLabel, 5), className: 'text-xs' },
  ];

  return (
    <div>
      <PageTitle title="Categories" subtitle={<>Select one or more categories to drill down from category → organization → project ideas. <CategorySourceBadge /></>}>
        <button className="btn" onClick={() => exportStats('categories', stats, 'category-statistics')} disabled={!stats.length}>
          Export category stats
        </button>
      </PageTitle>

      <div className="mb-4">
        <Collapsible title={<>Category rules {built.categorySource === 'rules' && <Badge tone="amber">in use</Badge>}</>} defaultOpen={built.categorySource === 'none'}>
          <RulesEditor />
        </Collapsible>
      </div>

      {built.categorySource === 'none' ? (
        <Notice kind="warn" title="No categories defined">The CSV has no category column and no rules are defined. Add a rule above to group organizations by their Technologies/Topics tags.</Notice>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Project counts across categories" subtitle={mapping.technologies ? 'Organizations per category (project-level counts are not in the CSV). Click to select.' : ''} exportName="category-counts" exportRows={stats.map((s) => ({ Category: s.key, Organizations: s.orgs }))}>
              <VBar data={stats.map((s) => ({ key: s.key, label: s.key, value: s.orgs }))} selected={selected} onSelect={(k) => toggle('categories', k)} />
            </ChartCard>
            <ChartCard title="Top technologies by category" subtitle="8 most common technologies, stacked per category" exportName="category-by-technology" exportRows={stacked.rows.map((r) => ({ Category: r.label, ...Object.fromEntries(stacked.keys.map((k) => [stacked.labels[k], r[k]])) }))}>
              <StackedBar rows={stacked.rows} seriesKeys={stacked.keys} seriesLabels={stacked.labels} height={256} />
            </ChartCard>
          </div>

          <ChartCard title="All categories" subtitle="Sortable · click a name to select">
            <DataTable rows={stats} cols={cols} rowKey={(s) => s.key} pageSize={12} initialSort={{ id: 'orgs', dir: 'desc' }} />
          </ChartCard>

          <section className="card p-3" aria-label="Selected categories">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                {selected.length ? `Selected: ${selected.join(mode === 'AND' ? ' AND ' : ' OR ')}` : 'Select a category above to drill down'}
              </h2>
              <div className="flex items-center gap-2">
                {selected.length > 1 && <Tabs value={mode} onChange={(m) => setMode('categories', m)} items={[{ id: 'OR', label: 'Any (OR)' }, { id: 'AND', label: 'All (AND)' }]} />}
                {selected.length > 0 && <button className="btn" onClick={() => setOnly('categories', [])}>Clear</button>}
              </div>
            </div>
            {!selected.length ? (
              <Empty>Pick one or more categories (bars, table, or the Category filter). Technology and topic distributions and the organization list below follow your selection and every other active filter.</Empty>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <ChartCard title="Technologies in selection" exportName="selected-categories-technologies" exportRows={tally(records, 'technologies').map((t) => ({ Technology: techLabel(t.key), Organizations: t.count }))}>
                    <HBar data={techDist} />
                  </ChartCard>
                  <ChartCard title="Topics in selection" exportName="selected-categories-topics" exportRows={tally(records, 'topics').map((t) => ({ Topic: topicLabel(t.key), Organizations: t.count }))}>
                    <HBar data={topicDist} />
                  </ChartCard>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Organizations ({records.length}) — click one for its project-ideas link and details</h3>
                  <OrgTable records={records} exportName={`categories-${selected.join('+')}`} />
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
