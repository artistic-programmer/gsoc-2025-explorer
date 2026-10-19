import type { FacetField, Filters, MatchMode, OrgRecord } from './types';

export const emptyFilters = (): Filters => ({
  search: '',
  categories: [],
  technologies: [],
  topics: [],
  organizations: [],
  languages: [],
  modes: { categories: 'OR', technologies: 'OR', topics: 'OR', languages: 'OR' },
  metricRanges: {},
});

const hayCache = new WeakMap<OrgRecord, string>();
function haystack(r: OrgRecord): string {
  let h = hayCache.get(r);
  if (h === undefined) {
    h = [r.name, r.description ?? '', ...r.technologies, ...r.topics, ...r.categories].join('\n').toLowerCase();
    hayCache.set(r, h);
  }
  return h;
}

function facetMatch(values: string[], selected: string[], mode: MatchMode): boolean {
  if (!selected.length) return true;
  const set = new Set(values);
  return mode === 'AND' ? selected.every((s) => set.has(s)) : selected.some((s) => set.has(s));
}

export type FilterKey = FacetField | 'organizations' | 'search' | 'metrics';

/**
 * Apply every active filter. `exclude` skips one filter group — used for
 * faceted counts (a facet's own option list is counted with its own filter removed,
 * so picking one technology does not make the other technologies vanish).
 */
export function applyFilters(records: OrgRecord[], f: Filters, exclude?: FilterKey): OrgRecord[] {
  const terms = f.search.toLowerCase().split(/\s+/).filter(Boolean);
  const orgSet = new Set(f.organizations);
  const metricKeys = Object.keys(f.metricRanges);
  return records.filter((r) => {
    if (exclude !== 'search' && terms.length) {
      const h = haystack(r);
      if (!terms.every((t) => h.includes(t))) return false;
    }
    if (exclude !== 'organizations' && orgSet.size && !orgSet.has(r.id)) return false;
    if (exclude !== 'categories' && !facetMatch(r.categories, f.categories, f.modes.categories)) return false;
    if (exclude !== 'technologies' && !facetMatch(r.technologies, f.technologies, f.modes.technologies)) return false;
    if (exclude !== 'topics' && !facetMatch(r.topics, f.topics, f.modes.topics)) return false;
    if (exclude !== 'languages' && !facetMatch(r.languages, f.languages, f.modes.languages)) return false;
    if (exclude !== 'metrics') {
      for (const m of metricKeys) {
        const { min, max } = f.metricRanges[m];
        const v = r.metrics[m];
        if ((min !== undefined || max !== undefined) && v === undefined) return false;
        if (min !== undefined && v < min) return false;
        if (max !== undefined && v > max) return false;
      }
    }
    return true;
  });
}

export function activeFilterCount(f: Filters): number {
  return (
    (f.search.trim() ? 1 : 0) +
    f.categories.length +
    f.technologies.length +
    f.topics.length +
    f.organizations.length +
    f.languages.length +
    Object.values(f.metricRanges).filter((r) => r.min !== undefined || r.max !== undefined).length
  );
}
