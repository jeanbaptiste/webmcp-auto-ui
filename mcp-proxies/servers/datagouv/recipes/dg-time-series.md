---
id: dg-time-series
name: Time series of a national indicator
description: Render a long INSEE/SDES time series as a line chart, with stat-cards on initial vs final value and percentage change, plus a table of recent years
when: the user asks for the historical evolution of a single national indicator
servers: [datagouv]
tools_used: [search_datasets, list_dataset_resources, query_resource_data]
data_type: timeseries CSV (year, value)
components_used: [chart, stat-card, text, table]
layout:
  type: grid
  columns: 2
  arrangement: full-width line chart on top, stats + table below
---

## When to use

The user asks about the evolution of an indicator over time:
- "Évolution du salaire moyen depuis 2010"
- "Courbe du nombre de logements vacants en France"
- "Comment a évolué le SMIC ?"
- "Tendance de la pauvreté en France"

INSEE and SDES publish many long series on data.gouv.fr — this recipe wraps the storytelling around the line.

## How to use

1. **Find a series resource**:
   ```js
   const search = await call('search_datasets', { query: 'salaire moyen INSEE série', page_size: 5 });
   const ds = search?.datasets?.[0];
   const resList = ds ? await call('list_dataset_resources', { dataset_id: ds.id }).catch(() => ({ resources: [] })) : { resources: [] };
   const csv = (resList?.resources ?? []).find(r => r.format === 'csv') ?? (resList?.resources ?? [])[0];
   if (!ds) {
     await widget('text', { content: 'Aucun dataset trouvé.' });
   } else if (!csv) {
     await widget('text', { content: 'Aucune ressource CSV.' });
   }
   ```

2. **Read the series — auto-detect year and value columns**:
   ```js
   const data = csv ? await call('query_resource_data', {
     resource_id: csv.id,
     page_size: 200
   }).catch(() => ({ rows: [] })) : { rows: [] };
   const allRows = data?.rows ?? [];

   // Auto-detect year column: first column whose values look like 4-digit years
   const sampleRow = allRows[0] ?? {};
   const yearCol = Object.keys(sampleRow).find(k =>
     k !== '__id' && /ann[eé]e|year|an$/i.test(k) && String(sampleRow[k]).match(/^\d{4}$/)
   ) ?? Object.keys(sampleRow).find(k =>
     k !== '__id' && String(sampleRow[k]).match(/^(19|20)\d{2}$/)
   );
   // Auto-detect value column: first numeric column that is not a year or id
   const valueCol = Object.keys(sampleRow).find(k =>
     k !== '__id' && k !== yearCol && Number.isFinite(Number(sampleRow[k])) && !String(sampleRow[k]).match(/^\d{4}$/)
   );

   if (!yearCol || !valueCol) {
     await widget('text', { content: 'Impossible de détecter les colonnes année/valeur.' });
   }

   const rows = allRows
     .filter(r => yearCol && valueCol && Number.isFinite(Number(r[valueCol])) && String(r[yearCol]).match(/^\d{4}$/))
     .sort((a, b) => Number(a[yearCol]) - Number(b[yearCol]));

   if (rows.length === 0) {
     await widget('text', { content: 'Aucune donnée temporelle.' });
   }
   ```

3. **Render line chart + KPIs + recent-years table**:
   ```js
   const first = rows[0] ?? {};
   const last = rows[rows.length - 1] ?? {};
   const firstVal = Number(first[valueCol]);
   const lastVal = Number(last[valueCol]);
   const change = (Number.isFinite(firstVal) && firstVal !== 0) ? ((lastVal - firstVal) / firstVal * 100).toFixed(1) : 'n/a';

   await widget('chart', {
     type: 'line',
     data: { labels: rows.map(r => r[yearCol] ?? '—'), values: rows.map(r => Number(r[valueCol])) },
     options: { xLabel: 'Année', yLabel: valueCol }
   });

   await widget('stat-card', { label: `Valeur ${first[yearCol] ?? '—'}`, value: first[valueCol] ?? '—', icon: 'flag' });
   await widget('stat-card', { label: `Valeur ${last[yearCol] ?? '—'}`, value: last[valueCol] ?? '—', icon: 'flag-checkered' });
   await widget('stat-card', { label: 'Variation', value: change === 'n/a' ? '—' : `${change} %`, icon: 'trending-up' });

   const tableRows = rows.length > 0 ? rows.slice(-10).reverse().map(r => [r[yearCol] ?? '—', r[valueCol] ?? '—']) : [];
   await widget('table', {
     columns: ['Année', valueCol],
     rows: tableRows
   });
   ```

## Examples

### Infirmiers du secteur public hospitalier (2003–2023)
<!-- dataset: 622633125eafccb7033e0c52 — resource: 5a7c057e-2a73-4c60-b4d7-b9b9462189ab
     Colonnes: Année (year), Effectifs (float), Secteur, Professions
     Filter: Professions="4 - Infirmiers" côté API, Secteur="Public" côté client
     21 points annuels → tabular API confirmed -->
```js
const data = await call('query_resource_data', {
  resource_id: '5a7c057e-2a73-4c60-b4d7-b9b9462189ab',
  filter_column: 'Professions',
  filter_value: '4 - Infirmiers',
  page_size: 50
}).catch(() => ({ rows: [] }));
const rows = (data?.rows ?? [])
  .filter(r => r['Secteur'] === 'Public' && Number.isFinite(Number(r['Effectifs'])))
  .sort((a, b) => Number(a['Année']) - Number(b['Année']));
await widget('chart', { type: 'line', data: { labels: rows.map(r => r['Année'] ?? '—'), values: rows.map(r => Number(r['Effectifs'])) }, options: { xLabel: 'Année', yLabel: 'Effectifs' } });
const last = rows.at(-1);
const first = rows.at(0);
const pct = (first && last && Number(first['Effectifs']) !== 0) ? (((Number(last['Effectifs']) - Number(first['Effectifs'])) / Number(first['Effectifs'])) * 100).toFixed(1) : null;
await widget('stat-card', { label: `${first?.['Année'] ?? '—'} → ${last?.['Année'] ?? '—'}`, value: pct != null ? `${pct} %` : '—', icon: 'trending-up' });
await widget('table', { columns: ['Année', 'Effectifs'], rows: rows.slice(-10).reverse().map(r => [r['Année'] ?? '—', r['Effectifs'] ?? '—']) });
```

## Common mistakes

- **Mixing nominal and real values** — salaries in current euros vs constant euros tell different stories; check the series description.
- **Sorting alphabetically on `annee`** — fine for 4-digit years, breaks if the column mixes "2020" and "2020T1"; cast to number when sorting.
- **Forgetting series breaks** — INSEE often flags a methodological break (e.g. census 2014 → 2017); display a vertical band in the chart or a footnote.
- **Smoothing without saying so** — never replace the raw series with a moving average without surfacing it; it changes the story.
- **Computing `% change` against zero** — guard the divisor; some series start at 0 (renewable energy in 1990).
