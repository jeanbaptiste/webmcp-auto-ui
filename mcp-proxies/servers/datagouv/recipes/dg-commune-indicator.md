---
id: dg-commune-indicator
name: Geolocated municipalities indicator (commune-level map)
description: Read a per-commune CSV, render points colored by the indicator value on a national map, top-10 ranking table, distribution chart and median stat-card
when: the user wants a municipality-level indicator (population density, social housing, ANAH programmes, school staff)
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
- "Top 10 communes les plus peuplées d'Île-de-France"
- "Cartographie des programmes ANAH par commune"
- "Quelles communes ont le plus de logements sociaux ?"
- "Densité de population des communes de montagne"

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
   // Dataset: communes France 2025 (dataset 6745d9ae4524d845d2138193)
   // resource f5df602b-3800-44d7-b2df-fa40a0350325 — 34 935 communes, toutes géocodées
   const markersData = rows
     .filter(r => Number.isFinite(Number(r.latitude_centre)) && Number.isFinite(Number(r.longitude_centre)))
     .map(r => ({
       lat: Number(r.latitude_centre),
       lon: Number(r.longitude_centre),
       value: Number(r.population) || 0,
       label: r.nom_standard ?? r.code_insee ?? '',
       popup: `${r.nom_standard ?? r.code_insee ?? '—'} · ${Number.isFinite(Number(r.population)) ? Number(r.population).toLocaleString('fr-FR') : '—'} hab.`
     }));
   await widget('map', {
     center: [46.6, 2.5],
     zoom: 6,
     markers: markersData.length > 0 ? markersData : [],
     color_field: 'value',
     color_scale: 'viridis'
   });

   const topRows = rows.length > 0 ? rows.slice(0, 10) : [];
   await widget('data-table', {
     columns: ['Rang', 'Commune', 'INSEE', 'Population'],
     rows: topRows.map((r, i) => [i + 1, r.nom_standard ?? r.code_insee ?? '—', r.code_insee ?? '—', Number.isFinite(Number(r.population)) ? Number(r.population).toLocaleString('fr-FR') : '—'])
   });

   const values = rows.map(r => Number(r.population)).filter(Number.isFinite).sort((a, b) => a - b);
   const median = values.length > 0 ? values[Math.floor(values.length / 2)] : 0;
   await widget('stat-card', { label: 'Médiane nationale', value: median.toLocaleString('fr-FR') + ' hab.', icon: 'target' });
   await widget('stat-card', { label: 'Communes', value: rows.length, icon: 'map-pin' });
   await widget('stat-card', { label: 'Top / médiane', value: (values.length > 0 && median > 0) ? (values.at(-1) / median).toFixed(1) + 'x' : '—', icon: 'gap' });

   const buckets = [0, 500, 2_000, 10_000, 100_000, Infinity];
   const counts = buckets.slice(0, -1).map((lo, i) => values.filter(v => v >= lo && v < buckets[i + 1]).length);
   if (values.length > 0) {
     await widget('chart', {
       type: 'bar',
       data: { labels: ['<500', '500-2k', '2-10k', '10-100k', '>100k'], values: counts }
     });
   }
   ```

## Examples

### Social housing stock per commune (RPLS 2021)
```js
// RPLS 2021 — dataset 63ce580d323b6878eca82ae4, resource e94f91e3-d50b-4281-abb3-8ec7725dc656
// Columns: COM (code INSEE), NCOM, TOT21 (total logements sociaux), LOYERMOY (loyer moyen €/m²)
// Communes dataset for geocoding — dataset 6745d9ae4524d845d2138193, resource f5df602b-3800-44d7-b2df-fa40a0350325
const rpls = await call('query_resource_data', {
  resource_id: 'e94f91e3-d50b-4281-abb3-8ec7725dc656',
  sort_column: 'TOT21',
  sort_direction: 'desc',
  page_size: 200
}).catch(() => ({ rows: [] }));
const rows = rpls?.rows ?? [];

// Enrich top communes with geocoordinates (one filter call per commune, batched on top-50)
const top = rows.slice(0, 50);
const geoRows = await Promise.all(top.map(r =>
  call('query_resource_data', {
    resource_id: 'f5df602b-3800-44d7-b2df-fa40a0350325',
    filter_column: 'code_insee',
    filter_value: r.COM.length === 4 ? '0' + r.COM : r.COM,
    page_size: 1
  }).catch(() => ({ rows: [] }))
));
const markers = top
  .map((r, i) => {
    const geo = geoRows[i]?.rows?.[0];
    if (!geo || !Number.isFinite(Number(geo.latitude_centre))) return null;
    return {
      lat: Number(geo.latitude_centre),
      lon: Number(geo.longitude_centre),
      value: Number(r.TOT21) || 0,
      label: r.NCOM ?? r.COM,
      popup: `${r.NCOM ?? r.COM} · ${Number(r.TOT21).toLocaleString('fr-FR')} logements sociaux`
    };
  })
  .filter(Boolean);

await widget('map', { center: [2.5, 46.6], zoom: 6, markers, color_field: 'value', color_scale: 'viridis' });
await widget('data-table', {
  columns: ['Rang', 'Commune', 'INSEE', 'Logements soc.', 'Loyer moy. (€/m²)'],
  rows: rows.slice(0, 10).map((r, i) => [i + 1, r.NCOM ?? '—', r.COM ?? '—', Number(r.TOT21).toLocaleString('fr-FR'), Number(r.LOYERMOY).toFixed(2)])
});
```

## Common mistakes

- **CSV without lat/lon** — many INSEE files only carry `code_commune`; geocode via the centroid (or use the BAN API) before mapping.
- **Plotting all 35 000 communes** as raw markers — group small ones into clusters or switch to choropleth above ~2 000 features.
- **Confusing `code_commune` (INSEE) and `code_postal`** — postal codes are ambiguous (one code → many communes); always map on INSEE.
- **Showing absolute values without normalising by population** — top-10 commune lists are dominated by Paris/Lyon/Marseille; offer per-capita variants when relevant.
- **Forgetting fusion communes** — communes nouvelles change INSEE codes after merges; use the most recent COG snapshot.
