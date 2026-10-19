import { useMemo } from 'react';
import { useApp } from '../state/store';
import { ChartCard, CategorySourceBadge, Kpi, Notice, PageTitle } from '../components/ui';
import { Donut, HBar, VBar, XYScatter } from '../components/charts';
import { DataTable, type Col } from '../components/DataTable';
import { tally } from '../lib/aggregate';
import type { OrgRecord } from '../lib/types';

export default function Overview() {
  const { records, allRecords, facets, built, mapping, techLabel, topicLabel, toggle, filters, openRecord } = useApp();

  const kpis = useMemo(() => {
    const uniq = (f: 'technologies' | 'topics' | 'categories') => new Set(records.flatMap((r) => r[f])).size;
    const withIdeas = new Set(records.filter((r) => r.ideasLink).map((r) => r.ideasLink)).size;
    const tagTotal = records.reduce((s, r) => s + r.technologies.length + r.topics.length, 0);
    return { techs: uniq('technologies'), topics: uniq('topics'), cats: uniq('categories'), withIdeas, avgTags: records.length ? tagTotal / records.length : 0 };
  }, [records]);

  const catData = tally(facets.categories, 'categories').map((t) => ({ key: t.key, label: t.key, value: t.count }));
  const techData = tally(facets.technologies, 'technologies').slice(0, 15).map((t) => ({ key: t.key, label: techLabel(t.key), value: t.count }));
  const topicData = tally(facets.topics, 'topics').slice(0, 15).map((t) => ({ key: t.key, label: topicLabel(t.key), value: t.count }));
  const langAll = tally(facets.languages, 'languages');
  const langData = langAll.slice(0, 9).map((t) => ({ key: t.key, label: techLabel(t.key), value: t.count }));
  const langOther = langAll.slice(9).reduce((s, t) => s + t.count, 0);
  const langDonut = langOther ? [...langData, { key: '__other', label: 'Other languages', value: langOther }] : langData;

  const scatter = useMemo(() => {
    const m = new Map<string, { x: number; y: number; z: number }>();
    records.forEach((r) => {
      const k = `${r.technologies.length}|${r.topics.length}`;
      const e = m.get(k) ?? { x: r.technologies.length, y: r.topics.length, z: 0 };
      e.z++;
      m.set(k, e);
    });
    return [...m.values()];
  }, [records]);

  const cols: Col<OrgRecord>[] = useMemo(() => {
    const c: Col<OrgRecord>[] = [
      { id: 'name', header: 'Organization', sort: (r) => r.name.toLowerCase(), render: (r) => <button className="text-left font-medium text-blue-700 hover:underline dark:text-blue-300" onClick={() => openRecord(r.id)}>{r.name}</button> },
      { id: 'tech', header: '# Technologies', sort: (r) => r.technologies.length, render: (r) => r.technologies.length, className: 'tabular-nums' },
      { id: 'topics', header: '# Topics', sort: (r) => r.topics.length, render: (r) => r.topics.length, className: 'tabular-nums' },
      { id: 'breadth', header: 'Breadth (tags listed)', sort: (r) => r.technologies.length + r.topics.length, render: (r) => r.technologies.length + r.topics.length, className: 'tabular-nums' },
      { id: 'cats', header: 'Categories', render: (r) => r.categories.join(', ') || '—' },
    ];
    mapping.metrics.forEach((m) => c.push({ id: `m-${m}`, header: m, sort: (r) => r.metrics[m] ?? -1, render: (r) => r.metrics[m]?.toLocaleString() ?? '—', className: 'tabular-nums' }));
    return c;
  }, [mapping.metrics, openRecord]);

  return (
    <div>
      <PageTitle title="Overview" subtitle={<>Every number reflects the active filters. <CategorySourceBadge /></>} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Organizations" value={records.length} hint={`of ${allRecords.length} loaded`} />
        <Kpi label="Unique technologies" value={kpis.techs} hint="distinct values in Technologies" />
        <Kpi label="Unique topics" value={kpis.topics} hint="distinct values in Topics" />
        <Kpi label="Unique categories" value={built.categorySource === 'none' ? '—' : kpis.cats} hint={built.categorySource === 'rules' ? 'rule-based' : built.categorySource === 'csv' ? 'from CSV' : 'no rules defined'} />
        <Kpi label="Ideas pages" value={kpis.withIdeas} hint="distinct “Ideas Link” URLs" />
        <Kpi label="Avg tags per org" value={kpis.avgTags.toFixed(1)} hint="technologies + topics" />
      </div>
      <div className="mb-4">
        <Notice kind="warn" title="What this dataset can and cannot show">
          One row = one organization. There are no project rows, repository links, star/fork/contributor counts or dates, so project counts, popularity rankings, metric scatter plots and trends are not shown.
          Details on the Data Quality page.
        </Notice>
      </div>

      {records.length === 0 ? (
        <Notice kind="warn" title="No organizations match the current filters">Use Reset in the filter bar to start again.</Notice>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {built.categorySource !== 'none' && (
            <ChartCard title="Organizations by category" subtitle="Click a bar to filter. An organization can sit in several categories." exportName="categories-chart" exportRows={catData.map((d) => ({ Category: d.label, Organizations: d.value }))}>
              <VBar data={catData} selected={filters.categories} onSelect={(k) => toggle('categories', k)} />
            </ChartCard>
          )}
          <ChartCard title="Programming language distribution" subtitle="Technologies tags that appear in the editable language list (Data Quality). Not a CSV column." exportName="languages-chart" exportRows={langDonut.map((d) => ({ Language: d.label, Organizations: d.value }))}>
            <Donut data={langDonut.filter((d) => d.key !== '__other')} selected={filters.languages} onSelect={(k) => toggle('languages', k)} />
          </ChartCard>
          <ChartCard title="Most common technologies" subtitle="Top 15 · click to filter · counts ignore this chart’s own selection so alternatives stay visible" exportName="technologies-chart" exportRows={techData.map((d) => ({ Technology: d.label, Organizations: d.value }))}>
            <HBar data={techData} selected={filters.technologies} onSelect={(k) => toggle('technologies', k)} />
          </ChartCard>
          <ChartCard title="Most common topics" subtitle="Top 15 · click to filter" exportName="topics-chart" exportRows={topicData.map((d) => ({ Topic: d.label, Organizations: d.value }))}>
            <HBar data={topicData} selected={filters.topics} onSelect={(k) => toggle('topics', k)} />
          </ChartCard>
          <ChartCard title="Tags listed per organization" subtitle="Computed from the lists in the CSV (not a source metric). Bubble size = number of organizations." exportName="tags-per-org" exportRows={scatter.map((s) => ({ 'Technologies listed': s.x, 'Topics listed': s.y, Organizations: s.z }))}>
            <XYScatter data={scatter} xName="Technologies listed" yName="Topics listed" />
          </ChartCard>
          <ChartCard title="Projects per organization" subtitle="Not available">
            <Notice kind="warn" title="No project rows in this CSV">The file lists organizations only, so a per-organization project count cannot be calculated and is not estimated.</Notice>
          </ChartCard>
          <ChartCard className="lg:col-span-2" title="Organizations by breadth of listed tags" subtitle="Sortable. No popularity, size or acceptance metrics exist in this CSV, so this ranks only by how many technologies/topics each organization lists.">
            <DataTable rows={records} cols={cols} rowKey={(r) => r.id} pageSize={10} initialSort={{ id: 'breadth', dir: 'desc' }} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
