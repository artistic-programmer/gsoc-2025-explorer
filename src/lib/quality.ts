import type { BuildResult } from './records';
import type { ColumnMapping, QualityReport, RawRow } from './types';

export function buildQuality(
  headers: string[],
  rows: RawRow[],
  mapping: ColumnMapping,
  built: BuildResult,
  parseErrors: string[],
): QualityReport {
  const missingByColumn: Record<string, number> = {};
  for (const h of headers) missingByColumn[h] = rows.filter((r) => !(r[h] ?? '').trim()).length;

  const dupes = (col?: string, lower = true) => {
    if (!col) return [];
    const seen = new Map<string, number>();
    for (const r of rows) {
      const v = (r[col] ?? '').trim();
      if (!v) continue;
      const k = lower ? v.toLowerCase() : v;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    return [...seen.entries()].filter(([, c]) => c > 1).map(([k]) => k);
  };

  const caseVariantTokens: QualityReport['caseVariantTokens'] = [];
  const slashTokens: QualityReport['slashTokens'] = [];
  (['technologies', 'topics'] as const).forEach((field) => {
    built.variants[field].forEach((vars, key) => {
      if (vars.size > 1) caseVariantTokens.push({ field, key, variants: [...vars.keys()] });
      if (key.includes('/')) slashTokens.push({ field, token: built.labels[field].get(key) ?? key });
    });
  });

  const unavailable: QualityReport['unavailable'] = [];
  if (!mapping.category)
    unavailable.push({
      feature: 'Source categories',
      reason: 'The CSV has no category column. Categories shown are rule-based groupings you define (Categories → Rules).',
    });
  unavailable.push({
    feature: 'Project-level analysis',
    reason: 'Each CSV row is one organization. There are no project names, project descriptions or per-project technology columns; the "Ideas Link" only points to the organization’s own ideas page.',
  });
  if (!mapping.metrics.length)
    unavailable.push({
      feature: 'Metrics (stars, forks, contributors, accepted students)',
      reason: 'No numeric metric columns were detected, so popularity/size rankings and metric scatter plots are not possible.',
    });
  unavailable.push({
    feature: 'Repository links',
    reason: mapping.ideasLink
      ? 'No repository-URL column. Only the organization page and ideas link are available.'
      : 'No repository or ideas link column was found.',
  });
  unavailable.push({
    feature: 'Trend over time',
    reason: 'No date/year column exists, so no valid time series can be drawn.',
  });
  unavailable.push({
    feature: 'Dedicated programming-language column',
    reason: 'None found. The language view applies an editable language list to the Technologies tags (a lookup, not source data).',
  });
  if (!mapping.technologies) unavailable.push({ feature: 'Technology analysis', reason: 'No Technologies column mapped.' });
  if (!mapping.topics) unavailable.push({ feature: 'Topic analysis', reason: 'No Topics column mapped.' });

  return {
    rowsLoaded: rows.length,
    validRecords: built.records.length,
    rowsWithoutName: built.invalidRows,
    duplicateNames: dupes(mapping.name),
    duplicateUrls: dupes(mapping.url),
    missingByColumn,
    emptyTechnologies: built.records.filter((r) => r.technologies.length === 0).length,
    emptyTopics: built.records.filter((r) => r.topics.length === 0).length,
    caseVariantTokens,
    slashTokens,
    parseErrors,
    unavailable,
  };
}
