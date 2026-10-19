# GSoC Data Explorer

An interactive, fully local dashboard for exploring Google Summer of Code organization data: which organizations are associated with which categories, technologies and topics. No backend, no paid APIs, no database, no login. Your CSV never leaves your browser.

**Stack:** React 18 · Vite · TypeScript · Tailwind CSS · Recharts · Papa Parse · Lucide React

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Other commands:

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm test           # 29 tests: parser, normalization, filters, aggregates, exports, UI flows
```

The bundled file `public/data/gsoc_2025_organizations.csv` loads automatically. Use **Upload CSV** in the header to analyse a different file (the column mapping is re-detected on upload).

## What your CSV contains (and what that allows)

`gsoc_2025_organizations.csv` — 185 rows × 7 columns, **one row per organization**:

| CSV column | Maps to | Notes |
|---|---|---|
| `Organization` | organization name | unique, no empties |
| `URL` | GSoC organization page link | |
| `Technologies` | technologies | Python-style list string, e.g. `['python', 'c++']` |
| `Topics` | topics | same list format |
| `Ideas Link` | project-ideas link | link to the organization's own ideas page |
| `Logo` | logo URL | shown in the detail panel |
| `Short Description` | description | searched by global search |

**Not in the file, therefore not shown (and never invented):** category, project names/descriptions, repository URLs, stars/forks/contributor counts, dates, a programming-language column. The app says so wherever a related view would normally appear (see the **Data Quality** page for the full list).

How the gaps are handled:

- **Categories** — no category column exists, so categories are *rule-based groupings you define* (Categories → Rules). A starter template is loaded so you can explore immediately; it is clearly labelled "rule-based" everywhere, assigns a category only when one of an organization's own tags exactly matches a keyword, and shows the matched tags in the detail panel. Edit, replace or clear it freely. If an uploaded CSV has a category column, it is used directly and the rules are ignored.
- **Programming languages** — derived by checking the Technologies tags against an editable language list (Data Quality page). It is a lookup, labelled as such.
- **Projects** — the Projects page lists each organization's Ideas Link and says plainly that project rows are not in this data. Upload a per-project CSV and the mapping UI will use it.
- **Metrics / scatter / trends** — numeric columns with metric-like names (stars, forks, contributors, …) are detected automatically and light up the table columns, metric filters and sorting. None exist here, so the scatter shows a *computed* "tags listed per organization" view, clearly labelled as not a source metric.

## Data model & normalization

1. **Ingestion** — Papa Parse (header row, BOM stripped, blank lines skipped). Raw rows are kept untouched; the original cell text is available in each record's detail panel.
2. **Column mapping** — header names are matched against synonym lists; override any mapping on the Data Quality page.
3. **List parsing** — cells are read as Python/JSON list literals, or as text delimited by `|`, `;` or `,`. A `/` is *never* a delimiter by default.
4. **Automatic normalization (only this)** — Unicode NFKC, trim, collapse whitespace, lower-case. `AI` and `ai` count as one; the display label is the most common original spelling.
5. **Opt-in normalization** — in Technologies/Topics → *Inspect & normalise*: see every original spelling, accept suggested merges (e.g. `node.js` + `nodejs`), add manual merges, split compound values such as `C/C++`, or split all `/` values. Every rule is listed and individually undoable. Nothing merges unless you accept it.
6. **Record** — one per organization: normalized `technologies`, `topics`, derived `languages`, `categories` (+ evidence), raw lists, metrics, and the untouched raw row.

## Features

- **Global filters** (persistent bar): search, category, technology, topic, language, organization, metric ranges. Multi-select with explicit **Any (OR) / All (AND)** per group; different groups combine with AND. Live "N of M organizations" and one-click Reset. Active filters are shown as removable chips.
- **Consistency:** every KPI, chart and table uses the same filtered record set. Option lists and the clickable bar charts use *faceted* counts (their own filter is excluded) so picking one technology doesn't make the alternatives disappear.
- **Overview:** KPIs, category/technology/topic/language charts, tags-per-organization scatter, sortable table. Charts are click-to-filter.
- **Categories:** counts, drill-down category → organization → detail, technology/topic distributions, stacked technology-by-category comparison, rules editor.
- **Technologies / Topics:** search, sortable stats tables, multi-select compare, overlap tables (counts + Jaccard), organizations overlapping ≥2 selected values, category distributions, technology × topic/category heatmap (colour = number of organizations, with legend and tooltips), shared-by-N filter.
- **Organizations / Projects:** sortable, searchable, paginated tables; detail panel with original CSV values; external links open safely.
- **Insights:** each insight states how it was calculated; popularity is never claimed.
- **Data Quality:** rows loaded / valid, duplicates, missing values, format inconsistencies, column mapping editor, list of analyses that can't be done and why.
- **Exports (CSV, respecting active filters):** filtered organizations/projects, technology stats, topic stats, category stats, insights, and the data behind every chart (CSV button on each chart card). Cells starting with `= + - @` are escaped against spreadsheet formula injection.
- **UI:** light by default, dark mode toggle, responsive layout, keyboard-accessible controls, preferences (theme, category rules, normalization rules) saved in `localStorage`.

## Try the primary workflow

1. Filter bar → **Category** → *Web Development*.
2. **Technology** → *Python* (or React) and **Topic** → *Education* (or any topic in the CSV).
3. The count updates, and every page (Overview, Organizations, Insights, …) reflects it. **Organizations → Export CSV** downloads exactly those rows.

(The starter *Developer Tools* category matches tags such as `developer tools`, `compilers`, `testing` and `tools` in the Topics column — edit the rule to taste. You can also pick the raw topic `developer tools` directly in the Topic filter.)

## Project structure

```
public/data/gsoc_2025_organizations.csv   your data (loaded on start)
src/
  lib/            parse · normalize · records · categories · filters · aggregate · export · quality (+ lib.test.ts)
  state/store.tsx app state: dataset, rules, filters, derived memoized records/facets
  components/     charts · Heatmap · DataTable · MultiSelect · Layout (sidebar/header/filter bar) · RecordModal · ui
  pages/          Overview · Categories · Technologies/Topics (FacetExplorer) · Organizations · Projects · Insights · DataQuality
  app.test.tsx    jsdom UI tests against the real CSV
```

## Notes

- Everything is computed in memory in the browser (185 rows is instant; thousands of rows are fine thanks to memoized aggregation and paginated tables).
- Logo images load from summerofcode.withgoogle.com when online and are hidden if unavailable.
- The production bundle is ~680 kB (Recharts); fine for local use.
