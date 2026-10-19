import { parseList, parseNumber } from './parse';
import { baseKey, pickLabel, resolveToken } from './normalize';
import type { CategoryRule, ColumnMapping, FieldRules, NormRules, OrgRecord, RawRow } from './types';

/**
 * Starter list used for the "Programming language" view. It is a user-editable
 * lookup applied to the Technologies tags the CSV already lists; the CSV has no
 * dedicated language column.
 */
export const DEFAULT_LANGUAGES = [
  'python', 'javascript', 'typescript', 'c', 'c++', 'c#', 'java', 'rust', 'go', 'golang', 'kotlin', 'swift',
  'ruby', 'php', 'scala', 'haskell', 'r', 'julia', 'dart', 'lua', 'perl', 'ocaml', 'fortran', 'matlab',
  'sql', 'lisp', 'clojure', 'elixir', 'erlang', 'zig', 'nim', 'objective-c', 'assembly', 'shell', 'bash',
  'solidity', 'groovy', 'racket', 'prolog', 'coq', 'lean', 'cuda', 'verilog', 'vhdl', 'haxe',
];

export type VariantMap = Map<string, Map<string, number>>;

export interface BuildResult {
  records: OrgRecord[];
  labels: { technologies: Map<string, string>; topics: Map<string, string> };
  variants: { technologies: VariantMap; topics: VariantMap };
  categorySource: 'csv' | 'rules' | 'none';
  invalidRows: number;
}

function expand(cells: string[], rules: FieldRules, variants: VariantMap) {
  const keys: string[] = [];
  for (const cell of cells) {
    for (const { key, display } of resolveToken(cell, rules)) {
      keys.push(key);
      const m = variants.get(key) ?? new Map<string, number>();
      m.set(display, (m.get(display) ?? 0) + 1);
      variants.set(key, m);
    }
  }
  return Array.from(new Set(keys));
}

function ruleEvidence(rule: CategoryRule, techs: string[], topics: string[]): string[] {
  const pool = rule.field === 'technologies' ? techs : rule.field === 'topics' ? topics : [...techs, ...topics];
  const kws = rule.keywords.map(baseKey).filter(Boolean);
  if (!kws.length) return [];
  const hits = pool.filter((tag) => (rule.match === 'exact' ? kws.includes(tag) : kws.some((k) => tag.includes(k))));
  return Array.from(new Set(hits));
}

/** Build normalized records from raw rows. Raw rows are never modified. */
export function buildRecords(
  rows: RawRow[],
  mapping: ColumnMapping,
  norm: NormRules,
  categoryRules: CategoryRule[],
  languageList: string[],
): BuildResult {
  const variants = { technologies: new Map() as VariantMap, topics: new Map() as VariantMap };
  const langSet = new Set(languageList.map(baseKey));
  const get = (r: RawRow, col?: string) => (col ? (r[col] ?? '').trim() : '');
  const records: OrgRecord[] = [];
  let invalidRows = 0;
  const categorySource: BuildResult['categorySource'] = mapping.category
    ? 'csv'
    : categoryRules.some((r) => r.keywords.length)
      ? 'rules'
      : 'none';

  rows.forEach((row, idx) => {
    const name = get(row, mapping.name);
    if (!name) {
      invalidRows++;
      return;
    }
    const technologiesRaw = mapping.technologies ? parseList(row[mapping.technologies]) : [];
    const topicsRaw = mapping.topics ? parseList(row[mapping.topics]) : [];
    const technologies = expand(technologiesRaw, norm.technologies, variants.technologies);
    const topics = expand(topicsRaw, norm.topics, variants.topics);

    let categories: string[] = [];
    const categoryEvidence: Record<string, string[]> = {};
    if (categorySource === 'csv') {
      const seen = new Set<string>();
      for (const c of parseList(row[mapping.category!])) {
        const k = baseKey(c);
        if (!seen.has(k)) {
          seen.add(k);
          categories.push(c);
        }
      }
    } else if (categorySource === 'rules') {
      for (const rule of categoryRules) {
        const ev = ruleEvidence(rule, technologies, topics);
        if (ev.length) {
          categoryEvidence[rule.name] = Array.from(new Set([...(categoryEvidence[rule.name] ?? []), ...ev]));
        }
      }
      categories = Object.keys(categoryEvidence);
    }

    const metrics: Record<string, number> = {};
    for (const m of mapping.metrics) {
      const v = parseNumber(row[m]);
      if (v !== undefined) metrics[m] = v;
    }

    records.push({
      id: idx,
      name,
      url: get(row, mapping.url) || undefined,
      ideasLink: get(row, mapping.ideasLink) || undefined,
      logo: get(row, mapping.logo) || undefined,
      description: get(row, mapping.description) || undefined,
      technologies,
      topics,
      languages: technologies.filter((t) => langSet.has(t)),
      categories,
      categoryEvidence,
      technologiesRaw,
      topicsRaw,
      metrics,
      raw: row,
    });
  });

  const labels = {
    technologies: new Map<string, string>(),
    topics: new Map<string, string>(),
  };
  (['technologies', 'topics'] as const).forEach((f) => {
    variants[f].forEach((v, key) => labels[f].set(key, pickLabel(key, v)));
  });
  return { records, labels, variants, categorySource, invalidRows };
}

export function ensureRules(r?: Partial<FieldRules>): FieldRules {
  return { merges: r?.merges ?? {}, splits: r?.splits ?? {}, splitSlash: !!r?.splitSlash };
}
