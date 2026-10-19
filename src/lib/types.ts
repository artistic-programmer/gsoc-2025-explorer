export type RawRow = Record<string, string>;

/** Which CSV column feeds which internal field. `undefined` = column not present / not mapped. */
export interface ColumnMapping {
  name?: string;
  url?: string;
  ideasLink?: string;
  technologies?: string;
  topics?: string;
  category?: string;
  logo?: string;
  description?: string;
  /** Numeric columns detected (or chosen) as metrics, e.g. stars, forks, contributors. */
  metrics: string[];
}

export type FacetField = 'categories' | 'technologies' | 'topics' | 'languages';

export interface OrgRecord {
  id: number;
  name: string;
  url?: string;
  ideasLink?: string;
  logo?: string;
  description?: string;
  /** Normalized keys (lower-cased, merged/split per the active rules). */
  technologies: string[];
  topics: string[];
  /** Subset of `technologies` that appear in the user-editable language list. */
  languages: string[];
  categories: string[];
  /** For rule-based categories: which tags triggered each category. */
  categoryEvidence: Record<string, string[]>;
  /** Original, untouched values from the CSV cells. */
  technologiesRaw: string[];
  topicsRaw: string[];
  metrics: Record<string, number>;
  raw: RawRow;
}

export interface FieldRules {
  /** key -> target key (user-accepted merges). */
  merges: Record<string, string>;
  /** compound key -> parts (user-accepted splits, e.g. "c/c++" -> ["c","c++"]). */
  splits: Record<string, string[]>;
  /** Split every token containing "/" (off by default: "ci/cd", "ui/ux" are not two things). */
  splitSlash: boolean;
}

export interface NormRules {
  technologies: FieldRules;
  topics: FieldRules;
}

export interface CategoryRule {
  id: string;
  name: string;
  /** Which extracted field the keywords are compared with. */
  field: 'technologies' | 'topics' | 'both';
  match: 'exact' | 'contains';
  keywords: string[];
}

export type MatchMode = 'OR' | 'AND';

export interface Filters {
  search: string;
  categories: string[];
  technologies: string[];
  topics: string[];
  organizations: number[];
  languages: string[];
  modes: Record<FacetField, MatchMode>;
  metricRanges: Record<string, { min?: number; max?: number }>;
}

export interface QualityReport {
  rowsLoaded: number;
  validRecords: number;
  rowsWithoutName: number;
  duplicateNames: string[];
  duplicateUrls: string[];
  missingByColumn: Record<string, number>;
  emptyTechnologies: number;
  emptyTopics: number;
  caseVariantTokens: { field: string; key: string; variants: string[] }[];
  slashTokens: { field: string; token: string }[];
  parseErrors: string[];
  unavailable: { feature: string; reason: string }[];
}
