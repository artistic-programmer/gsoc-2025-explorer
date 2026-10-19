import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useApp } from '../state/store';
import { Notice, PageTitle } from '../components/ui';
import { DataTable, type Col } from '../components/DataTable';
import { Chips } from '../components/Chips';
import { downloadCsv } from '../lib/export';
import type { OrgRecord } from '../lib/types';
import { safeHref, useOrgExportRows } from './shared';

function host(u?: string) {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}

export default function Projects() {
  const { records, mapping, openRecord } = useApp();
  const exportRows = useOrgExportRows();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const cols: Col<OrgRecord>[] = useMemo(
    () => [
      { id: 'org', header: 'Organization', sort: (r) => r.name.toLowerCase(), render: (r) => <button className="text-left font-medium text-blue-700 hover:underline dark:text-blue-300" onClick={() => openRecord(r.id)}>{r.name}</button> },
      {
        id: 'desc',
        header: 'Description (from CSV)',
        render: (r) =>
          r.description ? (
            <div>
              <p className={expanded.has(r.id) ? '' : 'line-clamp-1'}>{r.description}</p>
              {r.description.length > 60 && (
                <button className="text-xs text-blue-600 dark:text-blue-400" aria-expanded={expanded.has(r.id)} onClick={() => setExpanded((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}>
                  {expanded.has(r.id) ? 'Less' : 'More'}
                </button>
              )}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          ),
        className: 'min-w-[220px]',
      },
      { id: 'tech', header: 'Technologies', render: (r) => <Chips field="technologies" keys={r.technologies} max={4} />, className: 'min-w-[180px]' },
      { id: 'topics', header: 'Topics', render: (r) => <Chips field="topics" keys={r.topics} max={4} />, className: 'min-w-[180px]' },
      {
        id: 'ideas',
        header: 'Project ideas page',
        sort: (r) => host(r.ideasLink),
        render: (r) =>
          safeHref(r.ideasLink) ? (
            <a className="inline-flex items-center gap-1 text-blue-700 hover:underline dark:text-blue-300" href={r.ideasLink} target="_blank" rel="noopener noreferrer">
              {host(r.ideasLink)} <ExternalLink size={11} />
            </a>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
    ],
    [expanded, openRecord],
  );

  return (
    <div className="space-y-4">
      <PageTitle title="Projects" subtitle="Project-idea pages by organization." />
      <Notice kind="warn" title="This CSV does not contain individual projects">
        {mapping.name ? 'Each row is a GSoC organization.' : ''} There are no project titles, per-project descriptions, per-project technologies or repository URLs, and none are invented here. What the file does provide is each
        organization’s own “Ideas Link”, listed below so you can jump to the real project list. If you upload a CSV with one row per project, map its columns on the Data Quality page and this view will list them.
      </Notice>
      <div className="card p-3">
        <DataTable
          rows={records}
          cols={cols}
          rowKey={(r) => r.id}
          pageSize={15}
          initialSort={{ id: 'org', dir: 'asc' }}
          searchText={(r) => `${r.name} ${r.description ?? ''} ${r.technologies.join(' ')} ${r.topics.join(' ')}`}
          onExport={() => downloadCsv('project-ideas-filtered', exportRows(records))}
          caption="Project ideas pages"
        />
      </div>
    </div>
  );
}
