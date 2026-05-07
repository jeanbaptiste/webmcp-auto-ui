---
id: dg-department-comparison
name: Department-level indicator comparison
description: Pull a national indicator with one row per French department, render a bar chart of top-15 departments, a top-10/flop-10 table and a ranking chart
when: the user asks for a per-department comparison of a single indicator (poverty, unemployment, renewable energy, etc.)
servers: [datagouv]
tools_used: [search_datasets, list_dataset_resources, query_resource_data]
data_type: INSEE/SDES indicator per French department (101 rows)
components_used: [table, chart, map]
layout:
  type: grid
  columns: 2
  arrangement: full-width bar chart on top, table top-10 + ranking chart below
---

## When to use

The user asks for a "by department" or "top departments for X" question:
- "Compare le taux de pauvreté par département"
- "Top 10 départements pour les énergies renouvelables"
- "Quels départements ont le plus de logements vacants ?"
- "Cartographie du chômage par département"

These questions all share the same shape: one indicator, 101 departments, ranking + map.

## How to use

1. **Find a per-department resource**:
   ```js
   const search = await call('search_datasets', { query: 'pauvreté département INSEE', page_size: 5 });
   const dataset = search?.datasets?.[0];
   const resList = dataset ? await call('list_dataset_resources', { dataset_id: dataset.id }).catch(() => ({ resources: [] })) : { resources: [] };
   const csv = (resList?.resources ?? []).find(r => r.format === 'csv') ?? (resList?.resources ?? [])[0];
   if (!dataset) {
     await widget('text', { content: 'Aucun dataset trouvé.' });
   } else if (!csv) {
     await widget('text', { content: 'Aucune ressource CSV.' });
   }
   ```

2. **Fetch the indicator sorted descending**:
   ```js
   const data = csv ? await call('query_resource_data', {
     resource_id: csv.id,
     sort_column: csv.csv_columns?.[0] ?? undefined,
     sort_direction: 'desc',
     page_size: 101
   }).catch(() => ({ rows: [] })) : { rows: [] };
   const rows = data?.rows ?? [];
   if (rows.length === 0) {
     await widget('text', { content: 'Aucune donnée.' });
   }
   ```

3. **Render map + ranking**:
   ```js
   // Dynamically resolve column names — actual CSV columns vary across datasets
   const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
   const codeCol = keys.find(k => /code.dep/i.test(k)) ?? keys.find(k => /^code/i.test(k)) ?? keys[0];
   const nameCol = keys.find(k => /nom.dep/i.test(k)) ?? keys.find(k => /^nom/i.test(k)) ?? keys[1] ?? codeCol;
   const valueCol = keys.find(k => keys.indexOf(k) > 0 && rows.slice(0, 5).every(r => r[k] !== '' && !isNaN(Number(r[k])))) ?? keys[keys.length - 1];

   if (rows.length === 0) {
     await widget('text', { content: 'Aucune donnée à afficher.' });
   } else {
     // The map widget does not support choropleth — render a bar chart of top-15 instead,
     // then the ranking table below. This preserves the spatial signal via the chart + table.
     const chartRows = rows.slice(0, 15);
     const chartValues = chartRows.map(r => Number(r[valueCol])).filter(Number.isFinite);
     if (chartValues.length > 0) {
       await widget('chart', {
         bars: chartRows.map(r => [r[nameCol] ?? r[codeCol] ?? '—', Number(r[valueCol])])
       });
     } else {
       await widget('text', { content: `Impossible de tracer le graphique : la colonne "${valueCol}" ne contient pas de valeurs numériques. Colonnes disponibles : ${keys.join(', ')}` });
     }

     await widget('data-table', {
       columns: ['Rang', 'Département', 'Code', 'Valeur'],
       rows: rows.slice(0, 10).map((r, i) => [i + 1, r[nameCol] ?? '—', r[codeCol] ?? '—', r[valueCol] ?? '—'])
     });
   }
   ```

## Examples

### Top 10 departments for poverty rate
```js
// dataset: "Logements et logements sociaux dans les départements" (Caisse des Dépôts)
// dataset_id: 6170ae0fa87ac5bb394b49b3 — resource_id: bf82e99f-cb74-48e6-b49f-9a0da726d5dc
// 116 rows/year, column "Taux de pauvreté* (en %)" — filter on année_publication to avoid duplicates
const data = await call('query_resource_data', {
  resource_id: 'bf82e99f-cb74-48e6-b49f-9a0da726d5dc',
  filters: { année_publication: '2023' },
  page_size: 120
}).catch(() => ({ rows: [] }));
const col = 'Taux de pauvreté* (en %)';
const rows = (data?.rows ?? [])
  .filter(r => r[col] != null && r[col] !== '')
  .sort((a, b) => Number(b[col]) - Number(a[col]))
  .slice(0, 10);
await widget('data-table', { columns: ['Département', 'Code', 'Taux %'], rows: rows.map(r => [r.nom_departement ?? '—', r.code_departement ?? '—', r[col] ?? '—']) });
```

### Top 10 departments for renewable energy share
```js
// ILLUSTRATIVE EXAMPLE — '<sdes-enr-resource-id>' is a placeholder.
// Before running, discover the real resource_id via search_datasets + list_dataset_resources
// (e.g. search_datasets({ query: 'part énergies renouvelables département SDES' }))
// then replace the placeholder with the actual resource id.
const data = await call('query_resource_data', {
  resource_id: '<sdes-enr-resource-id>', // ← replace with real id before use
  sort_column: 'part_enr',
  sort_direction: 'desc',
  page_size: 101
}).catch(() => ({ rows: [] }));
const rows = data?.rows ?? [];
if (rows.length === 0) {
  await widget('text', { content: 'Aucune donnée — vérifiez que le resource_id est correct.' });
} else {
  const keys = Object.keys(rows[0]);
  const codeCol = keys.find(k => /code.dep/i.test(k)) ?? 'code_dep';
  const nameCol = keys.find(k => /nom.dep/i.test(k)) ?? 'nom_dep';
  const valueCol = keys.find(k => /part_enr/i.test(k)) ?? keys[keys.length - 1];
  // The map widget does not support choropleth — use a bar chart of top-10 for visual ranking
  const chartValues = rows.slice(0, 10).map(r => Number(r[valueCol])).filter(Number.isFinite);
  if (chartValues.length > 0) {
    await widget('chart', { bars: rows.slice(0, 10).map(r => [r[nameCol] ?? '—', Number(r[valueCol])]) });
  } else {
    await widget('text', { content: `Colonne valeur "${valueCol}" non numérique. Colonnes : ${keys.join(', ')}` });
  }
}
```

## Common mistakes

- **Mixing department codes formats** — INSEE uses `01`-`95` plus `2A`/`2B` for Corsica and `971`-`976` for DOM. Treat the column as a string, never an int.
- **Including national totals** — many INSEE files have a `France entière` or `FR` row at the top; filter it out before sorting.
- **Choosing a yearly snapshot without saying so** — surface the year in the chart title; same indicator, different year ⇒ very different ranking.
- **Confusing `code_region` and `code_departement`** — some files mix both; check `get_resource_info` schema before sorting.
- **Ignoring DOM** — Mayotte (976) and Guyane (973) often top "top 10" rankings on poverty; never silently exclude them unless the user asks for "France métropolitaine".
