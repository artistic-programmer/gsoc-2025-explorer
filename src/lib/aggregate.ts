import type { FacetField, OrgRecord } from './types';

export interface TallyRow {
  key: string;
  count: number;
}

export function tally(records: OrgRecord[], field: FacetField): TallyRow[] {
  const m = new Map<string, number>();
  for (const r of records) for (const k of r[field]) m.set(k, (m.get(k) ?? 0) + 1);
  return sortTally(m);
}

export function sortTally(m: Map<string, number>): TallyRow[] {
  return [...m.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export interface FacetStat {
  key: string;
  orgs: number;
  pct: number;
  orgIds: number[];
  categories: TallyRow[];
  topics: TallyRow[];
  technologies: TallyRow[];
}

/**
 * For every value of `field`, count organizations and the distribution of the
 * other fields among those organizations. One pass over the records.
 */
export function facetStats(records: OrgRecord[], field: 'technologies' | 'topics' | 'categories'): FacetStat[] {
  type Acc = { ids: number[]; cats: Map<string, number>; tops: Map<string, number>; techs: Map<string, number> };
  const acc = new Map<string, Acc>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const r of records) {
    for (const key of r[field]) {
      let a = acc.get(key);
      if (!a) acc.set(key, (a = { ids: [], cats: new Map(), tops: new Map(), techs: new Map() }));
      a.ids.push(r.id);
      r.categories.forEach((c) => bump(a!.cats, c));
      r.topics.forEach((t) => bump(a!.tops, t));
      r.technologies.forEach((t) => bump(a!.techs, t));
    }
  }
  const total = records.length || 1;
  const out: FacetStat[] = [];
  acc.forEach((a, key) =>
    out.push({
      key,
      orgs: a.ids.length,
      pct: (a.ids.length / total) * 100,
      orgIds: a.ids,
      categories: sortTally(a.cats),
      topics: sortTally(a.tops).filter((t) => field !== 'topics' || t.key !== key),
      technologies: sortTally(a.techs).filter((t) => field !== 'technologies' || t.key !== key),
    }),
  );
  return out.sort((a, b) => b.orgs - a.orgs || a.key.localeCompare(b.key));
}

/** rows × cols co-occurrence counts (organizations having both a row value and a column value). */
export function crossMatrix(
  records: OrgRecord[],
  rowField: FacetField,
  colField: FacetField,
  rowKeys: string[],
  colKeys: string[],
): number[][] {
  const rIdx = new Map(rowKeys.map((k, i) => [k, i]));
  const cIdx = new Map(colKeys.map((k, i) => [k, i]));
  const m = rowKeys.map(() => colKeys.map(() => 0));
  for (const r of records) {
    const rs = r[rowField].filter((k) => rIdx.has(k));
    const cs = r[colField].filter((k) => cIdx.has(k));
    for (const a of rs) for (const b of cs) m[rIdx.get(a)!][cIdx.get(b)!]++;
  }
  return m;
}

/** Organizations that have ≥1 / all of the selected keys, for overlap tables. */
export function overlapCounts(records: OrgRecord[], field: FacetField, keys: string[]) {
  const sets = keys.map((k) => new Set(records.filter((r) => r[field].includes(k)).map((r) => r.id)));
  const all = sets.length ? [...sets[0]].filter((id) => sets.every((s) => s.has(id))) : [];
  const any = new Set<number>();
  sets.forEach((s) => s.forEach((id) => any.add(id)));
  const pairs: { a: string; b: string; both: number; jaccard: number }[] = [];
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      const both = [...sets[i]].filter((id) => sets[j].has(id)).length;
      const union = sets[i].size + sets[j].size - both;
      pairs.push({ a: keys[i], b: keys[j], both, jaccard: union ? both / union : 0 });
    }
  return { all: all.length, any: any.size, allIds: all, pairs };
}

export function histogram(values: number[]): { value: number; count: number }[] {
  const m = new Map<number, number>();
  values.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
  return [...m.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value - b.value);
}
