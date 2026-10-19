import { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useApp } from '../state/store';
import { Badge } from './ui';
import { Chips } from './Chips';

const safeHref = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : undefined);

export function RecordModal() {
  const { openId, openRecord, recordById, built, techLabel, topicLabel, mapping } = useApp();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showRaw, setShowRaw] = useState(false);
  const rec = openId == null ? undefined : recordById.get(openId);

  useEffect(() => {
    if (!rec) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openRecord(null);
    document.addEventListener('keydown', onKey);
    setShowRaw(false);
    return () => document.removeEventListener('keydown', onKey);
  }, [rec, openRecord]);

  if (!rec) return null;
  const orgHref = safeHref(rec.url);
  const ideasHref = safeHref(rec.ideasLink);
  const close = () => openRecord(null);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label={rec.name} className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {safeHref(rec.logo) && <img src={rec.logo} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-12 w-12 rounded border border-slate-200 bg-white object-contain dark:border-slate-700" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />}
            <div>
              <h2 className="text-lg font-semibold leading-tight">{rec.name}</h2>
              {rec.description && <p className="text-sm text-slate-500 dark:text-slate-400">{rec.description}</p>}
            </div>
          </div>
          <button ref={closeRef} className="btn px-1.5" onClick={close} aria-label="Close details">
            <X size={15} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {orgHref && (
            <a className="btn" href={orgHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} /> GSoC organization page
            </a>
          )}
          {ideasHref && (
            <a className="btn" href={ideasHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} /> Project ideas
            </a>
          )}
        </div>

        <Section title="Categories" extra={built.categorySource === 'rules' ? <Badge tone="amber">rule-based</Badge> : built.categorySource === 'csv' ? <Badge tone="green">from CSV</Badge> : undefined}>
          {rec.categories.length ? (
            <ul className="space-y-1 text-sm">
              {rec.categories.map((c) => (
                <li key={c}>
                  <span className="font-medium">{c}</span>
                  {rec.categoryEvidence[c] && (
                    <span className="text-xs text-slate-500">
                      {' '}
                      — matched tags: {rec.categoryEvidence[c].map((k) => (techLabelOrTopic(k, rec.technologies.includes(k), techLabel, topicLabel))).join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">None assigned.</p>
          )}
        </Section>

        <Section title={`Technologies (${rec.technologies.length})`} extra={mapping.technologies ? <Badge>column: {mapping.technologies}</Badge> : undefined}>
          <Chips field="technologies" keys={rec.technologies} max={50} onAfter={close} />
        </Section>
        <Section title={`Topics (${rec.topics.length})`} extra={mapping.topics ? <Badge>column: {mapping.topics}</Badge> : undefined}>
          <Chips field="topics" keys={rec.topics} max={50} onAfter={close} />
        </Section>

        {Object.keys(rec.metrics).length > 0 && (
          <Section title="Metrics">
            <dl className="grid grid-cols-2 gap-1 text-sm">
              {Object.entries(rec.metrics).map(([k, v]) => (
                <div key={k} className="flex justify-between rounded bg-slate-50 px-2 py-1 dark:bg-slate-800">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="tabular-nums">{v.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        <div className="mt-4">
          <button className="text-xs text-blue-600 dark:text-blue-400" onClick={() => setShowRaw(!showRaw)} aria-expanded={showRaw}>
            {showRaw ? 'Hide' : 'Show'} original CSV values
          </button>
          {showRaw && (
            <dl className="mt-2 space-y-1.5 text-xs">
              {Object.entries(rec.raw).map(([k, v]) => (
                <div key={k}>
                  <dt className="font-medium text-slate-500">{k}</dt>
                  <dd className="break-all font-mono text-[11px]">{v || <em className="text-slate-400">empty</em>}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

const techLabelOrTopic = (k: string, isTech: boolean, t: (k: string) => string, p: (k: string) => string) => (isTech ? t(k) : p(k));

function Section({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title} {extra}
      </h3>
      {children}
    </section>
  );
}
