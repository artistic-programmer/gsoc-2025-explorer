import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { detectMapping, parseCsvFile, parseCsvText, type ParsedCsv } from '../lib/parse';
import { buildRecords, DEFAULT_LANGUAGES, ensureRules, type BuildResult } from '../lib/records';
import { applyFilters, emptyFilters, activeFilterCount } from '../lib/filters';
import { starterRules } from '../lib/categories';
import { buildQuality } from '../lib/quality';
import type { CategoryRule, ColumnMapping, FacetField, Filters, NormRules, OrgRecord, QualityReport } from '../lib/types';
import { emptyFieldRules } from '../lib/normalize';

export type Page = 'overview' | 'categories' | 'technologies' | 'topics' | 'organizations' | 'projects' | 'insights' | 'quality';
export const PAGES: Page[] = ['overview', 'categories', 'technologies', 'topics', 'organizations', 'projects', 'insights', 'quality'];

interface Dataset {
  fileName: string;
  headers: string[];
  rows: ParsedCsv['rows'];
  errors: string[];
}

interface Ctx {
  loading: boolean;
  loadError: string | null;
  dataset: Dataset | null;
  mapping: ColumnMapping;
  setMapping: (m: ColumnMapping) => void;
  loadFile: (f: File) => Promise<void>;
  loadDefault: () => Promise<void>;

  normRules: NormRules;
  setNormRules: (n: NormRules) => void;
  categoryRules: CategoryRule[];
  setCategoryRules: (r: CategoryRule[]) => void;
  languageList: string[];
  setLanguageList: (l: string[]) => void;

  built: BuildResult;
  allRecords: OrgRecord[];
  /** Records after every active filter. All KPIs, charts and tables use this. */
  records: OrgRecord[];
  /** Faceted record sets: all filters except the named facet (used for option counts). */
  facets: Record<'categories' | 'technologies' | 'topics' | 'languages', OrgRecord[]>;
  quality: QualityReport | null;
  recordById: Map<number, OrgRecord>;
  techLabel: (k: string) => string;
  topicLabel: (k: string) => string;

  filters: Filters;
  setFilters: (f: Filters) => void;
  patch: (p: Partial<Filters>) => void;
  toggle: (field: FacetField, key: string) => void;
  setOnly: (field: FacetField, keys: string[]) => void;
  setMode: (field: FacetField, mode: 'OR' | 'AND') => void;
  resetFilters: () => void;
  activeCount: number;

  theme: 'light' | 'dark';
  toggleTheme: () => void;
  openId: number | null;
  openRecord: (id: number | null) => void;
  page: Page;
  navigate: (p: Page) => void;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const v = useContext(C);
  if (!v) throw new Error('useApp outside provider');
  return v;
};

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable — ignore */
  }
}

const hashPage = (): Page => {
  const h = window.location.hash.replace('#/', '').replace('#', '') as Page;
  return PAGES.includes(h) ? h : 'overview';
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ metrics: [] });

  const [normRules, setNormRulesRaw] = useState<NormRules>(() => {
    const s = load<Partial<NormRules>>('gsoc.norm', {});
    return { technologies: ensureRules(s.technologies), topics: ensureRules(s.topics) };
  });
  const [categoryRules, setCategoryRulesRaw] = useState<CategoryRule[]>(() => load('gsoc.catrules', null as unknown as CategoryRule[]) ?? starterRules());
  const [languageList, setLanguageListRaw] = useState<string[]>(() => load('gsoc.langs', DEFAULT_LANGUAGES));
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => load<'light' | 'dark'>('gsoc.theme', 'light'));
  const [openId, setOpenId] = useState<number | null>(null);
  const [page, setPage] = useState<Page>(hashPage());

  const setNormRules = useCallback((n: NormRules) => { setNormRulesRaw(n); save('gsoc.norm', n); }, []);
  const setCategoryRules = useCallback((r: CategoryRule[]) => { setCategoryRulesRaw(r); save('gsoc.catrules', r); }, []);
  const setLanguageList = useCallback((l: string[]) => { setLanguageListRaw(l); save('gsoc.langs', l); }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    save('gsoc.theme', theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => setPage(hashPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const ingest = useCallback((fileName: string, parsed: ParsedCsv) => {
    setDataset({ fileName, headers: parsed.headers, rows: parsed.rows, errors: parsed.errors });
    setMapping(detectMapping(parsed.headers, parsed.rows));
    setFilters(emptyFilters());
    setLoadError(parsed.rows.length ? null : parsed.errors[0] ?? 'The file contains no data rows.');
  }, []);

  const loadDefault = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/gsoc_2025_organizations.csv`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ingest('gsoc_2025_organizations.csv', parseCsvText(await res.text()));
    } catch (e) {
      setLoadError(`Could not load the bundled CSV (${(e as Error).message}). Use “Upload CSV” to load a file.`);
    } finally {
      setLoading(false);
    }
  }, [ingest]);

  useEffect(() => { void loadDefault(); }, [loadDefault]);

  const loadFile = useCallback(async (f: File) => {
    setLoading(true);
    try {
      ingest(f.name, await parseCsvFile(f));
    } catch (e) {
      setLoadError(`Could not read ${f.name}: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [ingest]);

  const built = useMemo(
    () => (dataset ? buildRecords(dataset.rows, mapping, normRules, categoryRules, languageList) : buildRecords([], { metrics: [] }, { technologies: emptyFieldRules(), topics: emptyFieldRules() }, [], [])),
    [dataset, mapping, normRules, categoryRules, languageList],
  );
  const allRecords = built.records;
  const records = useMemo(() => applyFilters(allRecords, filters), [allRecords, filters]);
  const facets = useMemo(
    () => ({
      categories: applyFilters(allRecords, filters, 'categories'),
      technologies: applyFilters(allRecords, filters, 'technologies'),
      topics: applyFilters(allRecords, filters, 'topics'),
      languages: applyFilters(allRecords, filters, 'languages'),
    }),
    [allRecords, filters],
  );
  const quality = useMemo(
    () => (dataset ? buildQuality(dataset.headers, dataset.rows, mapping, built, dataset.errors) : null),
    [dataset, mapping, built],
  );
  const recordById = useMemo(() => new Map(allRecords.map((r) => [r.id, r])), [allRecords]);
  const techLabel = useCallback((k: string) => built.labels.technologies.get(k) ?? k, [built]);
  const topicLabel = useCallback((k: string) => built.labels.topics.get(k) ?? k, [built]);

  const patch = useCallback((p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p })), []);
  const toggle = useCallback((field: FacetField, key: string) => {
    setFilters((f) => ({ ...f, [field]: f[field].includes(key) ? f[field].filter((k) => k !== key) : [...f[field], key] }));
  }, []);
  const setOnly = useCallback((field: FacetField, keys: string[]) => setFilters((f) => ({ ...f, [field]: keys })), []);
  const setMode = useCallback((field: FacetField, mode: 'OR' | 'AND') => setFilters((f) => ({ ...f, modes: { ...f.modes, [field]: mode } })), []);
  const resetFilters = useCallback(() => setFilters(emptyFilters()), []);
  const navigate = useCallback((p: Page) => { window.location.hash = `#/${p}`; setPage(p); }, []);

  const value: Ctx = {
    loading, loadError, dataset, mapping, setMapping, loadFile, loadDefault,
    normRules, setNormRules, categoryRules, setCategoryRules, languageList, setLanguageList,
    built, allRecords, records, facets, quality, recordById, techLabel, topicLabel,
    filters, setFilters, patch, toggle, setOnly, setMode, resetFilters, activeCount: activeFilterCount(filters),
    theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    openId, openRecord: setOpenId, page, navigate,
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
