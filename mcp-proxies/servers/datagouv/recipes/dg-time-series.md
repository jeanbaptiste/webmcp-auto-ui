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
   const resList = await call('list_dataset_resources', { dataset_id: search.datasets[0].id });
   const csv = resList.resources.find(r => r.format === 'csv');
   ```

2. **Read the series sorted by year**:
   ```js
   const data = await call('query_resource_data', {
     resource_id: csv.id,
     sort_column: 'annee',
     sort_direction: 'asc',
     page_size: 100
   });
   const rows = data.rows;
   ```

3. **Render line chart + KPIs + recent-years table**:
   ```js
   const first = rows[0];
   const last = rows[rows.length - 1];
   const change = ((Number(last.valeur) - Number(first.valeur)) / Number(first.valeur) * 100).toFixed(1);

   await widget('chart', {
     type: 'line',
     data: { labels: rows.map(r => r.annee), values: rows.map(r => Number(r.valeur)) },
     options: { xLabel: 'Année', yLabel: 'Valeur' }
   });

   await widget('stat-card', { label: `Valeur ${first.annee}`, value: first.valeur, icon: 'flag' });
   await widget('stat-card', { label: `Valeur ${last.annee}`, value: last.valeur, icon: 'flag-checkered' });
   await widget('stat-card', { label: 'Variation', value: `${change} %`, icon: 'trending-up' });

   await widget('table', {
     columns: ['Année', 'Valeur'],
     rows: rows.slice(-10).reverse().map(r => [r.annee, r.valeur])
   });
   ```

## Examples

### Average salary since 2010
```js
const data = await call('query_resource_data', {
  resource_id: '<insee-salaire-moyen-resource-id>',
  sort_column: 'annee',
  page_size: 30
});
await widget('chart', { type: 'line', data: { labels: data.rows.map(r => r.annee), values: data.rows.map(r => r.salaire_moyen) } });
```

### Vacant housing in France
```js
const data = await call('query_resource_data', {
  resource_id: '<sdes-logements-vacants-resource-id>',
  sort_column: 'annee',
  page_size: 50
});
await widget('chart', { type: 'line', data: { labels: data.rows.map(r => r.annee), values: data.rows.map(r => r.logements_vacants) } });
await widget('stat-card', { label: 'Variation 10 ans', value: `${(((data.rows.at(-1).logements_vacants - data.rows.at(-10).logements_vacants) / data.rows.at(-10).logements_vacants) * 100).toFixed(1)} %` });
```

## Common mistakes

- **Mixing nominal and real values** — salaries in current euros vs constant euros tell different stories; check the series description.
- **Sorting alphabetically on `annee`** — fine for 4-digit years, breaks if the column mixes "2020" and "2020T1"; cast to number when sorting.
- **Forgetting series breaks** — INSEE often flags a methodological break (e.g. census 2014 → 2017); display a vertical band in the chart or a footnote.
- **Smoothing without saying so** — never replace the raw series with a moving average without surfacing it; it changes the story.
- **Computing `% change` against zero** — guard the divisor; some series start at 0 (renewable energy in 1990).
