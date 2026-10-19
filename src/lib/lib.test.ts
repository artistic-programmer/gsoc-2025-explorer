import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCsvText, parseList, detectMapping } from './parse';
import { buildRecords, DEFAULT_LANGUAGES } from './records';
import { emptyFieldRules, resolveToken, suggestMerges } from './normalize';
import { starterRules } from './categories';
import { applyFilters, emptyFilters } from './filters';
import { facetStats, tally, crossMatrix, overlapCounts } from './aggregate';
import { toCsv } from './export';
import { buildQuality } from './quality';

const csv = readFileSync('public/data/gsoc_2025_organizations.csv', 'utf8');
const parsed = parseCsvText(csv);
const mapping = detectMapping(parsed.headers, parsed.rows);
const norm = { technologies: emptyFieldRules(), topics: emptyFieldRules() };
const build = (rules = starterRules()) => buildRecords(parsed.rows, mapping, norm, rules, DEFAULT_LANGUAGES);

describe('parseList', () => {
  it('reads Python list literals', () => {
    expect(parseList("['python', 'c++', 'Django+PostgreSQL']")).toEqual(['python', 'c++', 'Django+PostgreSQL']);
  });
  it('handles double-quoted items containing apostrophes', () => {
    expect(parseList(`["it's", 'x']`)).toEqual(["it's", 'x']);
  });
  it('reads JSON arrays and delimited strings', () => {
    expect(parseList('["a","b"]')).toEqual(['a', 'b']);
    expect(parseList('a; b ;c')).toEqual(['a', 'b', 'c']);
    expect(parseList('a|b, c')).toEqual(['a', 'b, c']);
    expect(parseList('a, b')).toEqual(['a', 'b']);
  });
  it('does not split on slash and tolerates empties', () => {
    expect(parseList("['c/c++']")).toEqual(['c/c++']);
    expect(parseList('')).toEqual([]);
    expect(parseList('[]')).toEqual([]);
    expect(parseList(undefined)).toEqual([]);
  });
});

describe('CSV ingestion', () => {
  it('loads 185 rows / 7 columns and maps columns', () => {
    expect(parsed.rows.length).toBe(185);
    expect(parsed.headers.length).toBe(7);
    expect(mapping.name).toBe('Organization');
    expect(mapping.technologies).toBe('Technologies');
    expect(mapping.topics).toBe('Topics');
    expect(mapping.ideasLink).toBe('Ideas Link');
    expect(mapping.url).toBe('URL');
    expect(mapping.description).toBe('Short Description');
    expect(mapping.category).toBeUndefined();
    expect(mapping.metrics).toEqual([]);
  });
  it('survives garbage input', () => {
    const p = parseCsvText('');
    expect(p.rows).toEqual([]);
    expect(p.errors.length).toBeGreaterThan(0);
    const b = buildRecords(p.rows, detectMapping(p.headers, p.rows), norm, [], []);
    expect(b.records).toEqual([]);
  });
  it('detects numeric metric columns only with metric-like headers', () => {
    const p = parseCsvText('Name,Stars,Year\nA,10,2020\nB,20,2021\n');
    const m = detectMapping(p.headers, p.rows);
    expect(m.name).toBe('Name');
    expect(m.metrics).toEqual(['Stars']);
  });
});

describe('normalization', () => {
  it('lower-cases and keeps original casing for display', () => {
    const b = build();
    expect(b.labels.technologies.get('python')?.toLowerCase()).toBe('python');
    expect(b.variants.topics.get('ai')?.size).toBeGreaterThan(1); // "ai" and "AI" are inspectable variants
  });
  it('does not split slash tokens unless a rule says so', () => {
    expect(resolveToken('C/C++', emptyFieldRules()).map((x) => x.key)).toEqual(['c/c++']);
    expect(resolveToken('C/C++', { ...emptyFieldRules(), splitSlash: true }).map((x) => x.key)).toEqual(['c', 'c++']);
    expect(resolveToken('c/c++', { ...emptyFieldRules(), splits: { 'c/c++': ['c', 'c++'] } }).map((x) => x.key)).toEqual(['c', 'c++']);
  });
  it('applies accepted merges only', () => {
    const rules = { ...emptyFieldRules(), merges: { golang: 'go' } };
    expect(resolveToken('Golang', rules)[0].key).toBe('go');
    expect(resolveToken('Golang', emptyFieldRules())[0].key).toBe('golang');
    expect(suggestMerges(['node.js', 'nodejs', 'python'])[0].keys.sort()).toEqual(['node.js', 'nodejs']);
  });
  it('original values are preserved', () => {
    const b = build();
    const first = b.records[0];
    expect(first.technologiesRaw).toEqual(['javascript', 'android', 'java', 'web services', 'ogc standards']);
    expect(first.raw['Technologies']).toBe("['javascript', 'android', 'java', 'web services', 'ogc standards']");
  });
});

describe('aggregation & filters stay consistent', () => {
  const b = build();
  const all = b.records;
  it('tally equals facetStats and matches a filter', () => {
    const t = tally(all, 'technologies');
    const f = facetStats(all, 'technologies');
    expect(f.length).toBe(t.length);
    const py = t.find((x) => x.key === 'python')!;
    expect(f.find((x) => x.key === 'python')!.orgs).toBe(py.count);
    const filters = { ...emptyFilters(), technologies: ['python'] };
    expect(applyFilters(all, filters).length).toBe(py.count);
  });
  it('AND is a subset of OR', () => {
    const base = { ...emptyFilters(), technologies: ['python', 'javascript'] };
    const or = applyFilters(all, base);
    const and = applyFilters(all, { ...base, modes: { ...base.modes, technologies: 'AND' } });
    expect(and.length).toBeLessThanOrEqual(or.length);
    const ov = overlapCounts(all, 'technologies', ['python', 'javascript']);
    expect(ov.all).toBe(and.length);
    expect(ov.any).toBe(or.length);
  });
  it('facet exclusion keeps sibling options visible', () => {
    const f = { ...emptyFilters(), technologies: ['python'] };
    const withExclusion = applyFilters(all, f, 'technologies');
    expect(withExclusion.length).toBe(all.length);
  });
  it('search is case-insensitive and ANDs terms', () => {
    const r = applyFilters(all, { ...emptyFilters(), search: 'PYTHON machine' });
    expect(r.every((x) => /python/.test(JSON.stringify(x.technologies) + x.name.toLowerCase() + (x.description ?? '').toLowerCase() + x.topics.join(' ')))).toBe(true);
  });
  it('cross matrix sums match', () => {
    const m = crossMatrix(all, 'technologies', 'topics', ['python'], ['machine learning']);
    const direct = all.filter((r) => r.technologies.includes('python') && r.topics.includes('machine learning')).length;
    expect(m[0][0]).toBe(direct);
  });
});

describe('starter category rules', () => {
  const b = build();
  it('are labelled rule-based and give evidence from real tags', () => {
    expect(b.categorySource).toBe('rules');
    const web = b.records.filter((r) => r.categories.includes('Web Development'));
    expect(web.length).toBeGreaterThan(10);
    for (const r of web) {
      for (const tag of r.categoryEvidence['Web Development']) {
        expect(r.technologies.includes(tag) || r.topics.includes(tag)).toBe(true);
      }
    }
  });
  it('prints coverage', () => {
    const counts: Record<string, number> = {};
    b.records.forEach((r) => r.categories.forEach((c) => (counts[c] = (counts[c] ?? 0) + 1)));
    const none = b.records.filter((r) => r.categories.length === 0).length;
    console.log('CATEGORY COVERAGE', counts, 'uncategorized', none, 'of', b.records.length);
    expect(none).toBeLessThan(b.records.length);
  });
});

describe('quality + export', () => {
  const b = build();
  const q = buildQuality(parsed.headers, parsed.rows, mapping, b, parsed.errors);
  it('reports counts', () => {
    expect(q.rowsLoaded).toBe(185);
    expect(q.validRecords).toBe(185);
    expect(q.duplicateNames).toEqual([]);
    expect(q.unavailable.some((u) => u.feature.startsWith('Project-level'))).toBe(true);
  });
  it('escapes formulas and joins arrays', () => {
    const out = toCsv([{ a: '=SUM(1)', b: ['x', 'y'], c: 3 }]);
    expect(out).toContain("'=SUM(1)");
    expect(out).toContain('x; y');
  });
});
