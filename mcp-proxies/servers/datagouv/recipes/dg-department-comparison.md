---
id: dg-department-comparison
name: Department-level indicator comparison
description: Pull a national indicator with one row per French department, render a choropleth map, a top-10/flop-10 table and a bar chart of disparities
when: the user asks for a per-department comparison of a single indicator (poverty, unemployment, renewable energy, etc.)
servers: [datagouv]
tools_used: [search_datasets, list_dataset_resources, query_resource_data]
data_type: INSEE/SDES indicator per French department (101 rows)
components_used: [table, chart, map]
layout:
  type: grid
  columns: 2
  arrangement: full-width choropleth on top, table top-10 + bar chart below
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
   await widget('map', {
     mode: 'choropleth',
     geo_level: 'department',
     code_field: 'code_departement',
     value_field: 'taux_pauvrete',
     features: rows
   });

   await widget('table', {
     columns: ['Rang', 'Département', 'Code', 'Valeur'],
     rows: rows.slice(0, 10).map((r, i) => [i + 1, r.nom_departement ?? '—', r.code_departement ?? '—', r.taux_pauvrete ?? '—'])
   });

   await widget('chart', {
     type: 'bar',
     data: {
       labels: rows.slice(0, 15).map(r => r.nom_departement ?? '—'),
       values: rows.slice(0, 15).map(r => Number(r.taux_pauvrete)).filter(Number.isFinite)
     },
     options: { xLabel: 'Département', yLabel: 'Taux %' }
   });
   ```

## Examples

### Top 10 departments for poverty rate
```js
const data = await call('query_resource_data', {
  resource_id: '<insee-pauvrete-resource-id>',
  sort_column: 'taux_pauvrete',
  sort_direction: 'desc',
  page_size: 10
}).catch(() => ({ rows: [] }));
await widget('table', { columns: ['Département', 'Taux %'], rows: (data?.rows ?? []).map(r => [r.nom_departement ?? '—', r.taux_pauvrete ?? '—']) });
```

### Top 10 departments for renewable energy share
```js
const data = await call('query_resource_data', {
  resource_id: '<sdes-enr-resource-id>',
  sort_column: 'part_enr',
  sort_direction: 'desc',
  page_size: 101
}).catch(() => ({ rows: [] }));
const rows = data?.rows ?? [];
await widget('map', { mode: 'choropleth', geo_level: 'department', code_field: 'code_dep', value_field: 'part_enr', features: rows });
await widget('chart', { type: 'bar', data: { labels: rows.slice(0, 10).map(r => r.nom_dep ?? '—'), values: rows.slice(0, 10).map(r => Number(r.part_enr)).filter(Number.isFinite) } });
```

## Common mistakes

- **Mixing department codes formats** — INSEE uses `01`-`95` plus `2A`/`2B` for Corsica and `971`-`976` for DOM. Treat the column as a string, never an int.
- **Including national totals** — many INSEE files have a `France entière` or `FR` row at the top; filter it out before sorting.
- **Choosing a yearly snapshot without saying so** — surface the year in the chart title; same indicator, different year ⇒ very different ranking.
- **Confusing `code_region` and `code_departement`** — some files mix both; check `get_resource_info` schema before sorting.
- **Ignoring DOM** — Mayotte (976) and Guyane (973) often top "top 10" rankings on poverty; never silently exclude them unless the user asks for "France métropolitaine".
