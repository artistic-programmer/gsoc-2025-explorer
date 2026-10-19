import { useMemo, type ReactNode } from 'react';
import { useApp } from '../state/store';
import { Notice, PageTitle } from '../components/ui';
import { facetStats, overlapCounts } from '../lib/aggregate';
import { useLabeler } from './shared';
import { downloadCsv } from '../lib/export';

function Card({ title, how, children }: { title: string; how: string; children: ReactNode }) {
  return (
    <section className="card p-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-2 text-sm">{children}</div>
      <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-500 dark:border-slate-800">
        <strong>How it’s calculated:</strong> {how}
      </p>
    </section>
  );
}

function List({ items }: { items: { label: ReactNode; value: string }[] }) {
  if (!items.length) return <p className="text-slate-400">Nothing to show for the current filters.</p>;
  return (
    <ol className="space-y-0.5">
      {items.map((it, i) => (
        <li key={i} className="flex justify-between gap-3">
          <span>
            <span className="mr-1.5 text-xs text-slate-400">{i + 1}.</span>
            {it.label}
          </span>
          <span className="shrink-0 tabular-nums text-slate-500">{it.value}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Insights() {
  const { records, facets, filters, openRecord, built } = useApp();
  const lab = useLabeler();

  const tech = useMemo(() => facetStats(records, 'technologies'), [records]);
  const topics = useMemo(() => facetStats(records, 'topics'), [records]);
  const cats = useMemo(() => facetStats(records, 'categories'), [records]);
  const n = records.length;
  const pct = (x: number) => (n ? `${((x / n) * 100).toFixed(0)}%` : '–');

  const widest = [...topics].sort((a, b) => b.technologies.length - a.technologies.length || b.orgs - a.orgs).slice(0, 6);
  const techWide = [...tech].sort((a, b) => b.categories.length - a.categories.length || b.orgs - a.orgs).slice(0, 6);
  const broad = [...records].sort((a, b) => b.technologies.length + b.topics.length - (a.technologies.length + a.topics.length)).slice(0, 6);
  const shared = tech.filter((t) => t.orgs >= 2).length;
  const single = tech.filter((t) => t.orgs === 1).length;

  const combo = useMemo(() => (filters.technologies.length && filters.topics.length ? records : []), [records, filters]);
  const techOv = filters.technologies.length > 1 ? overlapCounts(facets.technologies, 'technologies', filters.technologies) : null;
  const topicOv = filters.topics.length > 1 ? overlapCounts(facets.topics, 'topics', filters.topics) : null;
  const catOv = filters.categories.length > 1 ? overlapCounts(facets.categories, 'categories', filters.categories) : null;

  const exportInsights = () =>
    downloadCsv('insights-summary', [
      ...tech.slice(0, 10).map((t) => ({ Insight: 'Most represented technologies', Item: lab('technologies', t.key), Value: t.orgs })),
      ...topics.slice(0, 10).map((t) => ({ Insight: 'Most common topics', Item: lab('topics', t.key), Value: t.orgs })),
      ...cats.map((t) => ({ Insight: 'Categories by organizations', Item: t.key, Value: t.orgs })),
      ...widest.map((t) => ({ Insight: 'Topics with widest technology diversity', Item: lab('topics', t.key), Value: t.technologies.length })),
    ]);

  if (!n) return <Notice kind="warn" title="No organizations match the current filters">Reset the filters to see insights.</Notice>;

  return (
    <div>
      <PageTitle title="Insights" subtitle={`Descriptive statistics for the ${n} organizations that match the current filters. Nothing here is a popularity measure — the CSV has none.`}>
        <button className="btn" onClick={exportInsights}>Export insights CSV</button>
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Most frequently represented technologies" how="For each technology, count the organizations whose Technologies cell lists it (once per organization). Sorted by count.">
          <List items={tech.slice(0, 8).map((t) => ({ label: lab('technologies', t.key), value: `${t.orgs} (${pct(t.orgs)})` }))} />
        </Card>
        <Card title="Most common topics" how="Same method on the Topics cell: organizations listing each topic, sorted by count.">
          <List items={topics.slice(0, 8).map((t) => ({ label: lab('topics', t.key), value: `${t.orgs} (${pct(t.orgs)})` }))} />
        </Card>
        {built.categorySource !== 'none' && (
          <Card title="Categories with the most organizations" how={`Organizations per category (${built.categorySource === 'csv' ? 'categories from the CSV column' : 'categories assigned by your rules — not source data'}). Project counts are unavailable because the CSV has no project rows.`}>
            <List items={cats.slice(0, 8).map((t) => ({ label: t.key, value: `${t.orgs} (${pct(t.orgs)})` }))} />
          </Card>
        )}
        <Card title="Technologies shared across organizations" how="A technology is “shared” when 2 or more distinct organizations list it. “Single” means exactly one organization lists it.">
          <p>
            <strong>{shared}</strong> of {tech.length} technologies are listed by 2+ organizations; <strong>{single}</strong> by only one.
          </p>
          <p className="mt-2 text-xs text-slate-500">Technologies spanning the most distinct categories:</p>
          <List items={techWide.map((t) => ({ label: lab('technologies', t.key), value: `${t.categories.length} categories · ${t.orgs} orgs` }))} />
        </Card>
        <Card title="Topics with the widest technology diversity" how="For each topic, count the distinct technologies listed by organizations that list that topic. Frequent topics naturally score higher; the organization count is shown for context.">
          <List items={widest.map((t) => ({ label: lab('topics', t.key), value: `${t.technologies.length} technologies · ${t.orgs} orgs` }))} />
        </Card>
        <Card title="Organizations listing the most tags" how="Number of technologies + topics in the organization’s own cells. This measures how many tags are listed, not size, popularity or acceptance.">
          <List items={broad.map((r) => ({ label: <button className="text-blue-700 hover:underline dark:text-blue-300" onClick={() => openRecord(r.id)}>{r.name}</button>, value: `${r.technologies.length + r.topics.length} tags` }))} />
        </Card>

        <Card title="Organizations matching your technology + topic selection" how="Organizations that satisfy every active filter, shown when at least one technology and one topic are selected (use the filter bar or the Technologies/Topics pages). Match modes (any/all) follow each filter’s setting.">
          {combo.length ? (
            <>
              <p className="mb-1">{combo.length} organization{combo.length === 1 ? '' : 's'}:</p>
              <ul className="flex flex-wrap gap-1">
                {combo.slice(0, 40).map((r) => (
                  <li key={r.id}>
                    <button className="chip hover:bg-blue-100 dark:hover:bg-blue-900/50" onClick={() => openRecord(r.id)}>{r.name}</button>
                  </li>
                ))}
                {combo.length > 40 && <li className="chip">+{combo.length - 40} more (see Organizations)</li>}
              </ul>
            </>
          ) : filters.technologies.length && filters.topics.length ? (
            <p className="text-slate-400">No organization matches this combination.</p>
          ) : (
            <p className="text-slate-400">Select at least one technology and one topic to see matches.</p>
          )}
        </Card>

        <Card title="Overlaps between selected values" how="Counts organizations (passing all other filters) that list all / any of the selected technologies, topics or categories.">
          {!techOv && !topicOv && !catOv ? (
            <p className="text-slate-400">Select two or more technologies, topics or categories to compare overlaps.</p>
          ) : (
            <ul className="space-y-1">
              {techOv && <li>Technologies: <strong>{techOv.all}</strong> list all {filters.technologies.length}; {techOv.any} list at least one.</li>}
              {topicOv && <li>Topics: <strong>{topicOv.all}</strong> list all {filters.topics.length}; {topicOv.any} list at least one.</li>}
              {catOv && <li>Categories: <strong>{catOv.all}</strong> are in all {filters.categories.length}; {catOv.any} in at least one.</li>}
            </ul>
          )}
        </Card>

        <Card title="Organizations with the most projects in a category" how="Not calculable: the CSV has no project rows, so no per-organization project counts exist. Nothing is estimated.">
          <p className="text-slate-400">Unavailable for this dataset.</p>
        </Card>
      </div>
    </div>
  );
}
