import Papa from 'papaparse';
import type { ColumnMapping, RawRow } from './types';

export interface ParsedCsv {
  headers: string[];
  rows: RawRow[];
  errors: string[];
}

/** Parse CSV text. Never throws: problems are reported in `errors`. */
export function parseCsvText(text: string): ParsedCsv {
  const clean = text.replace(/^\uFEFF/, '');
  const res = Papa.parse<RawRow>(clean, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const errors = res.errors.map((e) => `Row ${e.row ?? '?'}: ${e.message}`);
  const headers = (res.meta.fields ?? []).filter((h) => h !== '');
  const rows = res.data.map((r) => {
    const o: RawRow = {};
    for (const h of headers) o[h] = r[h] == null ? '' : String(r[h]);
    return o;
  });
  if (!headers.length) errors.unshift('No header row found — is this a CSV file?');
  return { headers, rows, errors };
}

export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  return parseCsvText(await file.text());
}

const tidy = (items: string[]) =>
  items.map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 0);

function splitDelimited(s: string): string[] {
  const delim = s.includes('|') ? '|' : s.includes(';') ? ';' : ',';
  return tidy(s.split(delim));
}

/**
 * Parse a multi-value cell. Handles Python/JSON list literals ("['a', 'b']"),
 * and plain strings delimited by | ; or ,. A "/" is NOT treated as a delimiter here.
 */
export function parseList(value: string | null | undefined): string[] {
  if (value == null) return [];
  const s = String(value).trim();
  if (!s) return [];
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return tidy(j.map((x) => String(x)));
    } catch {
      /* fall through to the Python-literal reader */
    }
    const out: string[] = [];
    const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) out.push((m[1] ?? m[2] ?? '').replace(/\\(['"\\])/g, '$1'));
    if (out.length) return tidy(out);
    return splitDelimited(s.slice(1, -1));
  }
  return splitDelimited(s);
}

const squash = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

const SYNONYMS: Record<Exclude<keyof ColumnMapping, 'metrics'>, string[]> = {
  name: ['organization', 'organisation', 'organizationname', 'org', 'orgname', 'name'],
  url: ['url', 'orgurl', 'profileurl', 'website', 'homepage', 'link'],
  ideasLink: ['ideaslink', 'ideas', 'projectideas', 'ideasurl', 'ideaslist', 'projectideaslink'],
  technologies: ['technologies', 'technology', 'tech', 'techstack', 'stack', 'languages', 'programminglanguages'],
  topics: ['topics', 'topic', 'tags', 'areas', 'keywords', 'subjects'],
  category: ['category', 'categories', 'orgcategory', 'organizationcategory'],
  logo: ['logo', 'logourl', 'image', 'imageurl'],
  description: ['shortdescription', 'description', 'summary', 'tagline', 'about'],
};

const METRIC_HINTS = /stars?|forks?|contributors?|accepted|students?|commits?|issues?|watchers?|count|slots|applications?|applicants?|views/i;

/** Map the actual CSV headers onto the internal data model. Unknown columns stay unmapped. */
export function detectMapping(headers: string[], rows: RawRow[]): ColumnMapping {
  const mapping: ColumnMapping = { metrics: [] };
  const used = new Set<string>();
  (Object.keys(SYNONYMS) as (keyof typeof SYNONYMS)[]).forEach((field) => {
    const hit = headers.find((h) => !used.has(h) && SYNONYMS[field].includes(squash(h)));
    if (hit) {
      mapping[field] = hit;
      used.add(hit);
    }
  });
  // Numeric metric columns: mostly-numeric values AND a metric-like header name.
  for (const h of headers) {
    if (used.has(h) || !METRIC_HINTS.test(h)) continue;
    const vals = rows.map((r) => (r[h] ?? '').trim()).filter(Boolean);
    if (!vals.length) continue;
    const numeric = vals.filter((v) => v !== '' && Number.isFinite(Number(v.replace(/,/g, ''))));
    if (numeric.length / vals.length >= 0.8) {
      mapping.metrics.push(h);
      used.add(h);
    }
  }
  return mapping;
}

export function parseNumber(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  const t = v.trim().replace(/,/g, '');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}
