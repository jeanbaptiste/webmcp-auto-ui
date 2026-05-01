---
id: dg-commune-indicator
name: Geolocated municipalities indicator (commune-level map)
description: Read a per-commune CSV, render points colored by the indicator value on a national map, top-10 ranking table, distribution chart and median stat-card
when: the user wants a municipality-level indicator (ANAH aid amounts, school staff, election results)
servers: [datagouv]
tools_used: [search_datasets, list_dataset_resources, query_resource_data]
data_type: per-commune indicator with INSEE code
components_used: [map, table, stat-card, chart]
layout:
  type: grid
  columns: 2
  arrangement: full-width map on top, table + chart + stats below
---

## When to use

The user asks a question at the commune scale:
- "Top 10 communes en transition écologique"
- "Cartographie des aides ANAH par commune"
- "Quelles communes ont le plus de logements sociaux ?"
- "Résultats des élections municipales par commune"

Many public datasets are distributed at the commune mesh — this recipe makes them legible.

## How to use

1. **Find the right resource**:
   ```js
   const search = await call('search_datasets', { query: 'ANAH aides commune', page_size: 5 });
   const ds = search?.datasets?.[0];
   const resList = ds ? await call('list_dataset_resources', { dataset_id: ds.id }).catch(() => ({ resources: [] })) : { resources: [] };
   const csv = (resList?.resources ?? []).find(r => r.format === 'csv') ?? (resList?.resources ?? [])[0];
   if (!ds) {
     await widget('text', { content: 'Aucun dataset trouvé.' });
   } else if (!csv) {
     await widget('text', { content: 'Aucune ressource CSV disponible.' });
   }
   ```

2. **Read the indicator sorted descending**:
   ```js
   const data = csv ? await call('query_resource_data', {
     resource_id: csv.id,
     page_size: 500
   }).catch(() => ({ rows: [], total: 0 })) : { rows: [], total: 0 };
   const rows = data?.rows ?? [];
   if (rows.length === 0) {
     await widget('text', { content: 'Aucune donnée pour cet indicateur.' });
   }
   ```

3. **Render national map (points colored by value), ranking, distribution, median**:
   ```js
   const markersData = rows
     .filter(r => (Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))) || r.code_commune)
     .map(r => ({
       lat: Number(r.latitude) || 46.6,
       lon: Number(r.longitude) || 2.5,
       value: Number(r.montant_aide) || 0,
       label: r.nom_commune ?? r.code_commune ?? '',
       popup: `${r.nom_commune ?? r.code_commune ?? '—'} · ${Number.isFinite(Number(r.montant_aide)) ? Number(r.montant_aide).toLocaleString('fr-FR') : '—'} €`
     }));
   await widget('map', {
     center: [46.6, 2.5],
     zoom: 6,
     markers: markersData.length > 0 ? markersData : [],
     color_field: 'value',
     color_scale: 'viridis'
   });

   const topRows = rows.length > 0 ? rows.slice(0, 10) : [];
   await widget('table', {
     columns: ['Rang', 'Commune', 'INSEE', 'Valeur'],
     rows: topRows.map((r, i) => [i + 1, r.nom_commune ?? r.code_commune ?? '—', r.code_commune ?? '—', Number.isFinite(Number(r.montant_aide)) ? Number(r.montant_aide).toLocaleString('fr-FR') : '—'])
   });

   const values = rows.map(r => Number(r.montant_aide)).filter(Number.isFinite).sort((a, b) => a - b);
   const median = values.length > 0 ? values[Math.floor(values.length / 2)] : 0;
   await widget('stat-card', { label: 'Médiane nationale', value: median.toLocaleString('fr-FR'), icon: 'target' });
   await widget('stat-card', { label: 'Communes', value: rows.length, icon: 'map-pin' });
   await widget('stat-card', { label: 'Top / médiane', value: (values.length > 0 && median > 0) ? (values.at(-1) / median).toFixed(1) + 'x' : '—', icon: 'gap' });

   const buckets = [0, 1000, 5000, 20_000, 100_000, Infinity];
   const counts = buckets.slice(0, -1).map((lo, i) => values.filter(v => v >= lo && v < buckets[i + 1]).length);
   if (values.length > 0) {
     await widget('chart', {
       type: 'bar',
       data: { labels: ['<1k', '1-5k', '5-20k', '20-100k', '>100k'], values: counts }
     });
   }
   ```

## Examples

### ANAH aid amounts per commune
```js
const data = await call('query_resource_data', {
  resource_id: '<anah-aides-resource-id>',
  sort_column: 'montant_aide',
  sort_direction: 'desc',
  page_size: 500
}).catch(() => ({ rows: [] }));
const rows = data?.rows ?? [];
await widget('map', { center: [46.6, 2.5], zoom: 6, markers: rows.filter(r => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))).map(r => ({ lat: Number(r.latitude), lon: Number(r.longitude), value: Number(r.montant_aide) })) });
await widget('table', { columns: ['Commune', 'Aide'], rows: rows.slice(0, 10).map(r => [r.nom_commune ?? '—', r.montant_aide ?? '—']) });
```

### Election results by commune (Ministère Intérieur)
```js
const data = await call('query_resource_data', {
  resource_id: '<elections-municipales-resource-id>',
  filter_column: 'code_departement',
  filter_value: '75',
  page_size: 100
}).catch(() => ({ rows: [] }));
const rows = data?.rows ?? [];
await widget('map', { center: [48.85, 2.35], zoom: 11, markers: rows.filter(r => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))).map(r => ({ lat: Number(r.latitude), lon: Number(r.longitude), label: r.nom_commune ?? '' })) });
```

## Common mistakes

- **CSV without lat/lon** — many INSEE files only carry `code_commune`; geocode via the centroid (or use the BAN API) before mapping.
- **Plotting all 35 000 communes** as raw markers — group small ones into clusters or switch to choropleth above ~2 000 features.
- **Confusing `code_commune` (INSEE) and `code_postal`** — postal codes are ambiguous (one code → many communes); always map on INSEE.
- **Showing absolute values without normalising by population** — top-10 commune lists are dominated by Paris/Lyon/Marseille; offer per-capita variants when relevant.
- **Forgetting fusion communes** — communes nouvelles change INSEE codes after merges; use the most recent COG snapshot.
