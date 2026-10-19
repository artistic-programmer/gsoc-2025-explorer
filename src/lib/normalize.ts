import type { FieldRules } from './types';

export const emptyFieldRules = (): FieldRules => ({ merges: {}, splits: {}, splitSlash: false });

/** The only automatic normalization: Unicode NFKC, trim, collapse whitespace, lower-case. */
export function baseKey(s: string): string {
  return s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

const unique = <T,>(a: T[]) => Array.from(new Set(a));

/**
 * Turn one original cell token into the key(s) it counts as, honouring only
 * rules the user has explicitly accepted. Returns [original-slice, key] pairs
 * so display labels can keep the original casing.
 */
export function resolveToken(original: string, rules: FieldRules): { key: string; display: string }[] {
  const k = baseKey(original);
  if (!k) return [];
  let parts: { key: string; display: string }[];
  const explicit = rules.splits[k];
  if (explicit) {
    parts = explicit.map((p) => ({ key: baseKey(p), display: p.trim() }));
  } else if (rules.splitSlash && original.includes('/')) {
    parts = original.split('/').map((p) => ({ key: baseKey(p), display: p.trim() }));
  } else {
    parts = [{ key: k, display: original.trim() }];
  }
  const out = parts
    .filter((p) => p.key)
    .map((p) => ({ key: rules.merges[p.key] ?? p.key, display: p.display }));
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)));
}

/** Pick a display label for a key from the original spellings that fed it. */
export function pickLabel(key: string, variants: Map<string, number>): string {
  const own = [...variants.entries()].filter(([v]) => baseKey(v) === key);
  const pool = own.length ? own : [];
  if (!pool.length) return key; // merge target typed by the user
  pool.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    const ua = /[A-Z]/.test(a[0]) ? 1 : 0;
    const ub = /[A-Z]/.test(b[0]) ? 1 : 0;
    if (ub !== ua) return ub - ua;
    return a[0].localeCompare(b[0]);
  });
  return pool[0][0];
}

/** Strip punctuation/spacing so near-identical spellings group together ("node.js", "nodejs", "node js"). */
const fuzzy = (k: string) => k.replace(/[\s._\-]/g, '');

export interface MergeSuggestion {
  keys: string[];
  reason: string;
}

/** Suggest (never apply) merges: keys that are identical once spacing/punctuation is ignored. */
export function suggestMerges(keys: string[]): MergeSuggestion[] {
  const groups = new Map<string, string[]>();
  for (const k of keys) {
    const f = fuzzy(k);
    if (!f) continue;
    groups.set(f, [...(groups.get(f) ?? []), k]);
  }
  const out: MergeSuggestion[] = [];
  groups.forEach((ks) => {
    if (unique(ks).length > 1) out.push({ keys: unique(ks), reason: 'same text ignoring spaces, dots, dashes' });
  });
  const known: [string, string][] = [
    ['golang', 'go'],
    ['js', 'javascript'],
    ['ts', 'typescript'],
    ['ai', 'artificial intelligence'],
    ['ml', 'machine learning'],
    ['cpp', 'c++'],
    ['k8s', 'kubernetes'],
  ];
  const set = new Set(keys);
  for (const [a, b] of known) {
    if (set.has(a) && set.has(b)) out.push({ keys: [a, b], reason: 'common abbreviation / alias' });
  }
  return out;
}
