import { useRef, useState, type ReactNode } from 'react';
import { BarChart3, Building2, Cpu, Layers, LayoutDashboard, Lightbulb, Menu, Moon, RotateCcw, Search, ShieldCheck, Sparkles, Sun, Tags, Upload, X } from 'lucide-react';
import { useApp, type Page } from '../state/store';
import { MultiSelect } from './MultiSelect';
import { tally } from '../lib/aggregate';
import { useMemo } from 'react';

const NAV: { id: Page; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'categories', label: 'Categories', icon: <Layers size={16} /> },
  { id: 'technologies', label: 'Technologies', icon: <Cpu size={16} /> },
  { id: 'topics', label: 'Topics', icon: <Tags size={16} /> },
  { id: 'organizations', label: 'Organizations', icon: <Building2 size={16} /> },
  { id: 'projects', label: 'Projects', icon: <Lightbulb size={16} /> },
  { id: 'insights', label: 'Insights', icon: <Sparkles size={16} /> },
  { id: 'quality', label: 'Data Quality', icon: <ShieldCheck size={16} /> },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { page, navigate, dataset } = useApp();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main navigation"
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <BarChart3 size={18} className="text-blue-600" /> GSoC Explorer
          </div>
          <button className="lg:hidden" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                navigate(n.id);
                onClose();
              }}
              aria-current={page === n.id ? 'page' : undefined}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                page === n.id ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 text-[11px] leading-snug text-slate-400">
          {dataset ? <>Data: {dataset.fileName}</> : 'No data loaded'}
          <br />
          Runs locally — nothing is uploaded.
        </div>
      </aside>
    </>
  );
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const { filters, patch, loadFile, theme, toggleTheme } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <button className="btn px-1.5 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu size={16} />
      </button>
      <label className="relative max-w-xl flex-1">
        <span className="sr-only">Global search</span>
        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        <input
          className="input pl-8"
          placeholder="Search organizations, descriptions, technologies, topics…"
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
          title="Matches organization name, short description, technologies, topics and categories. All words must match."
        />
      </label>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadFile(f);
          e.target.value = '';
        }}
      />
      <button className="btn" onClick={() => fileRef.current?.click()}>
        <Upload size={14} /> <span className="hidden sm:inline">Upload CSV</span>
      </button>
      <button className="btn px-1.5" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}

export function FilterBar() {
  const { allRecords, records, facets, filters, toggle, setOnly, setMode, patch, resetFilters, activeCount, techLabel, topicLabel, built, mapping } = useApp();
  const [metricOpen, setMetricOpen] = useState(false);

  const opts = useMemo(() => {
    const mk = (recs: typeof allRecords, f: 'categories' | 'technologies' | 'topics' | 'languages', lab: (k: string) => string) => {
      const counts = new Map(tally(recs, f).map((t) => [t.key, t.count]));
      // include every known value so zero-count options remain selectable/visible
      const keys = new Set<string>();
      allRecords.forEach((r) => r[f].forEach((k) => keys.add(k)));
      return [...keys].map((k) => ({ key: k, label: lab(k), count: counts.get(k) ?? 0 })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    };
    return {
      categories: mk(facets.categories, 'categories', (k) => k),
      technologies: mk(facets.technologies, 'technologies', techLabel),
      topics: mk(facets.topics, 'topics', topicLabel),
      languages: mk(facets.languages, 'languages', techLabel),
    };
  }, [allRecords, facets, techLabel, topicLabel]);

  const orgOptions = useMemo(() => allRecords.map((r) => ({ key: String(r.id), label: r.name })).sort((a, b) => a.label.localeCompare(b.label)), [allRecords]);
  const orgSel = filters.organizations.map(String);

  const chip = (text: string, onRemove: () => void) => (
    <span key={text} className="chip bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
      {text}
      <button onClick={onRemove} aria-label={`Remove filter ${text}`} className="hover:text-red-600">
        <X size={11} />
      </button>
    </span>
  );

  const modeText = (m: 'OR' | 'AND') => (m === 'AND' ? 'all of' : 'any of');
  return (
    <div className="sticky top-14 z-10 border-b border-slate-200 bg-slate-50/95 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex flex-wrap items-center gap-2">
        {built.categorySource !== 'none' && (
          <MultiSelect label="Category" options={opts.categories} selected={filters.categories} onToggle={(k) => toggle('categories', k)} onClear={() => setOnly('categories', [])} mode={filters.modes.categories} onMode={(m) => setMode('categories', m)} />
        )}
        <MultiSelect label="Technology" options={opts.technologies} selected={filters.technologies} onToggle={(k) => toggle('technologies', k)} onClear={() => setOnly('technologies', [])} mode={filters.modes.technologies} onMode={(m) => setMode('technologies', m)} />
        <MultiSelect label="Topic" options={opts.topics} selected={filters.topics} onToggle={(k) => toggle('topics', k)} onClear={() => setOnly('topics', [])} mode={filters.modes.topics} onMode={(m) => setMode('topics', m)} />
        <MultiSelect label="Language" options={opts.languages} selected={filters.languages} onToggle={(k) => toggle('languages', k)} onClear={() => setOnly('languages', [])} mode={filters.modes.languages} onMode={(m) => setMode('languages', m)} />
        <MultiSelect
          label="Organization"
          options={orgOptions}
          selected={orgSel}
          onToggle={(k) => {
            const id = Number(k);
            patch({ organizations: filters.organizations.includes(id) ? filters.organizations.filter((x) => x !== id) : [...filters.organizations, id] });
          }}
          onClear={() => patch({ organizations: [] })}
        />
        {mapping.metrics.length > 0 && (
          <button className="btn" onClick={() => setMetricOpen(!metricOpen)} aria-expanded={metricOpen}>
            Metrics
          </button>
        )}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="tabular-nums text-slate-600 dark:text-slate-300" aria-live="polite">
            <strong>{records.length}</strong> of {allRecords.length} organizations
          </span>
          <button className="btn" onClick={resetFilters} disabled={activeCount === 0}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>
      {metricOpen && mapping.metrics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {mapping.metrics.map((m) => (
            <div key={m} className="flex items-center gap-1">
              <span className="font-medium">{m}</span>
              <input type="number" className="input w-20 py-1" placeholder="min" aria-label={`${m} minimum`} value={filters.metricRanges[m]?.min ?? ''} onChange={(e) => patch({ metricRanges: { ...filters.metricRanges, [m]: { ...filters.metricRanges[m], min: e.target.value === '' ? undefined : Number(e.target.value) } } })} />
              <input type="number" className="input w-20 py-1" placeholder="max" aria-label={`${m} maximum`} value={filters.metricRanges[m]?.max ?? ''} onChange={(e) => patch({ metricRanges: { ...filters.metricRanges, [m]: { ...filters.metricRanges[m], max: e.target.value === '' ? undefined : Number(e.target.value) } } })} />
            </div>
          ))}
        </div>
      )}
      {activeCount > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span>Active (different filter groups combine with AND):</span>
          {filters.search.trim() && chip(`search “${filters.search.trim()}”`, () => patch({ search: '' }))}
          {filters.categories.length > 0 && (
            <>
              <span>Category {modeText(filters.modes.categories)}</span>
              {filters.categories.map((k) => chip(k, () => toggle('categories', k)))}
            </>
          )}
          {filters.technologies.length > 0 && (
            <>
              <span>Technology {modeText(filters.modes.technologies)}</span>
              {filters.technologies.map((k) => chip(techLabel(k), () => toggle('technologies', k)))}
            </>
          )}
          {filters.topics.length > 0 && (
            <>
              <span>Topic {modeText(filters.modes.topics)}</span>
              {filters.topics.map((k) => chip(topicLabel(k), () => toggle('topics', k)))}
            </>
          )}
          {filters.languages.length > 0 && (
            <>
              <span>Language {modeText(filters.modes.languages)}</span>
              {filters.languages.map((k) => chip(techLabel(k), () => toggle('languages', k)))}
            </>
          )}
          {filters.organizations.length > 0 && (
            <>
              <span>Organization is</span>
              {filters.organizations.map((id) => chip(allRecords.find((r) => r.id === id)?.name ?? String(id), () => patch({ organizations: filters.organizations.filter((x) => x !== id) })))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
