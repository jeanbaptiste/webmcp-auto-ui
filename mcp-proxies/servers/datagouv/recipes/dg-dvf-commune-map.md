---
id: dg-dvf-commune-map
name: Real-estate prices map (DVF) by commune
description: Filter DVF transactions by commune INSEE code, render a transactions map, top sales table, price distribution chart and key stat-cards (median, count, average)
when: the user asks about real-estate prices in a French commune or department
servers: [datagouv]
tools_used: [search_datasets, list_dataset_resources, query_resource_data]
data_type: DVF transactions filtered by INSEE commune code
components_used: [map, table, stat-card, chart]
layout:
  type: grid
  columns: 2
  arrangement: full-width map on top, table + chart + stats below
---

## When to use

The user asks about real-estate prices for a specific French commune or area:
- "Prix immobilier moyen à Marseille en 2023"
- "Cartographie des transactions DVF en Bretagne"
- "Quel est le prix m² médian à Bordeaux ?"
- "Top 10 des ventes à Paris l'an dernier"

DVF (Demandes de valeurs foncières, DGFiP) lists every notarised transaction since 2014, geocoded by lat/lon and INSEE code.

## How to use

1. **Locate the DVF dataset and its yearly resource**:
   ```js
   const dataset_id = '5cc1b94a634f4165e96436c1'; // DVF
   const resList = await call('list_dataset_resources', { dataset_id }).catch(() => ({ resources: [] }));
   // Pick the main tabular resource (csv.gz or csv), fallback to first resource
   // Note: as of 2025, the geo-DVF dataset has a single csv.gz spanning 2021-2025
   const resource = (resList?.resources ?? []).find(r => r.format === 'csv.gz' || r.format === 'csv' || r.format === 'parquet')
     ?? (resList?.resources ?? []).find(r => r.type === 'main')
     ?? (resList?.resources ?? [])[0];
   if (!resource) {
     await widget('text', { content: 'Ressource DVF introuvable.' });
   }
   ```

2. **Filter by commune code**:
   ```js
   // ⚠️ Paris/Lyon/Marseille: use arrondissement codes, not the city code.
   // Paris 75056 → no rows; use e.g. 75116 (16e, 38k tx) or 75109 (9e, 15k tx)
   // Marseille 13055 → no rows; use e.g. 13205 (5e, 13k tx)
   // Lyon 69123 → no rows; use e.g. 69383 (3e, 23k tx)
   // Bordeaux 33063 → works directly (69k tx, no arrondissements)
   const tx = resource ? await call('query_resource_data', {
     resource_id: resource.id,
     filter_column: 'code_commune',
     filter_value: '13205', // Marseille 5e Arrondissement
     page_size: 200
   }).catch(() => ({ rows: [] })) : { rows: [] };
   const _unwrap = r => Array.isArray(r) ? r : (r?.data ?? r?.results ?? r?.rows ?? r?.entries ?? r?.items ?? []);
   const rows = _unwrap(tx);
   if (rows.length === 0) {
     await widget('text', { content: 'Aucune transaction trouvée.' });
   }
   ```

3. **Compute aggregates and render**:
   ```js
   if (rows.length === 0) {
     await widget('text', { content: `Aucune transaction DVF trouvée pour ce code commune.` });
   } else {
     const prices = rows.map(r => Number(r.valeur_fonciere)).filter(Number.isFinite).sort((a, b) => a - b);
     const median = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;
     const avg = prices.length > 0 ? prices.reduce((s, x) => s + x, 0) / prices.length : 0;

     await widget('map', {
       center: [5.3949, 43.2930], // Marseille 5e Arrondissement
       zoom: 13,
       markers: rows.filter(r => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))).map(r => ({
         lat: Number(r.latitude),
         lon: Number(r.longitude),
         label: Number.isFinite(Number(r.valeur_fonciere)) ? `${Math.round(Number(r.valeur_fonciere)).toLocaleString('fr-FR')} €` : '—',
         popup: `${r.type_local ?? '—'} · ${r.surface_reelle_bati ?? '—'} m² · ${r.date_mutation ?? '—'}`
       }))
     });

     await widget('stat-card', { label: 'Transactions', value: rows.length || '—', icon: 'home' });
     await widget('stat-card', { label: 'Prix médian', value: `${Math.round(median).toLocaleString('fr-FR')} €`, icon: 'euro' });
     await widget('stat-card', { label: 'Prix moyen', value: `${Math.round(avg).toLocaleString('fr-FR')} €`, icon: 'trending-up' });

     await widget('data-table', {
       columns: ['Date', 'Type', 'Surface', 'Prix', 'Adresse'],
       rows: [...rows]
         .sort((a, b) => (Number(b.valeur_fonciere) || 0) - (Number(a.valeur_fonciere) || 0))
         .slice(0, 10)
         .map(r => [r.date_mutation ?? '—', r.type_local ?? '—', `${r.surface_reelle_bati ?? '—'} m²`, Number.isFinite(Number(r.valeur_fonciere)) ? `${Number(r.valeur_fonciere).toLocaleString('fr-FR')} €` : '—', `${r.adresse_numero ?? ''} ${r.adresse_nom_voie ?? ''}`.trim() || '—'])
     });

     // Price distribution histogram
     if (prices.length > 0) {
       const buckets = [0, 100_000, 250_000, 500_000, 1_000_000, Infinity];
       const counts = buckets.slice(0, -1).map((lo, i) => prices.filter(p => p >= lo && p < buckets[i + 1]).length);
       await widget('chart', {
         type: 'bar',
         data: { labels: ['<100k', '100-250k', '250-500k', '500k-1M', '>1M'], values: counts }
       });
     }
   }
   ```

## Examples

### Marseille 5e Arrondissement (auto-discovery DVF CSV)
```js
// 13205 = Marseille 5e Arrondissement (13k transactions géolocalisées)
// 13055 = code commune de la ville entière → aucun résultat dans DVF géolocalisé
const dvfList = await call('list_dataset_resources', { dataset_id: '5cc1b94a634f4165e96436c1' }).catch(() => ({ resources: [] }));
const dvfCsv = (dvfList?.resources ?? []).find(r => r.format === 'csv.gz' || r.format === 'csv' || r.format === 'parquet') ?? (dvfList?.resources ?? [])[0];
const tx = dvfCsv ? await call('query_resource_data', {
  resource_id: dvfCsv.id,
  filter_column: 'code_commune',
  filter_value: '13205',
  page_size: 200
}).catch(() => ({ rows: [] })) : { rows: [] };
const _unwrap = r => Array.isArray(r) ? r : (r?.data ?? r?.results ?? r?.rows ?? r?.entries ?? r?.items ?? []);
const rows = _unwrap(tx);
await widget('map', { center: [5.3949, 43.2930], zoom: 13, markers: rows.filter(r => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))).map(r => ({ lat: Number(r.latitude), lon: Number(r.longitude), label: Number.isFinite(Number(r.valeur_fonciere)) ? `${Math.round(Number(r.valeur_fonciere)).toLocaleString('fr-FR')} €` : '—' })) });
```

### Top sales in Bordeaux (auto-discovery DVF CSV)
```js
// 33063 = Bordeaux (code commune direct, 69k transactions — pas d'arrondissements)
const dvfList2 = await call('list_dataset_resources', { dataset_id: '5cc1b94a634f4165e96436c1' }).catch(() => ({ resources: [] }));
const dvfCsv2 = (dvfList2?.resources ?? []).find(r => r.format === 'csv.gz' || r.format === 'csv' || r.format === 'parquet') ?? (dvfList2?.resources ?? [])[0];
const tx2 = dvfCsv2 ? await call('query_resource_data', {
  resource_id: dvfCsv2.id,
  filter_column: 'code_commune',
  filter_value: '33063',
  sort_column: 'valeur_fonciere',
  sort_direction: 'desc',
  page_size: 10
}).catch(() => ({ rows: [] })) : { rows: [] };
const _unwrap2 = r => Array.isArray(r) ? r : (r?.data ?? r?.results ?? r?.rows ?? r?.entries ?? r?.items ?? []);
const rows2 = _unwrap2(tx2);
await widget('data-table', { columns: ['Date', 'Type', 'Prix'], rows: rows2.map(r => [r.date_mutation ?? '—', r.type_local ?? '—', r.valeur_fonciere ?? '—']) });
```

## Common mistakes

- **Filtering on `nom_commune`** — names are not unique (Saint-Denis, La Roche…). Always filter on `code_commune` (INSEE 5-digit code).
- **Using city-level codes for Paris / Lyon / Marseille** — `75056` (Paris), `13055` (Marseille), `69123` (Lyon) return **0 rows** in the geo-DVF. These cities are split into arrondissements, each with its own code. Use arrondissement codes: Paris 16e → `75116` (38k tx), Paris 9e → `75109` (15k tx); Marseille 5e → `13205` (13k tx), Marseille 1er → `13201` (9k tx); Lyon 3e → `69383` (23k tx), Lyon 6e → `69386` (11k tx). Bordeaux `33063` works directly (no arrondissements, 69k tx).
- **Treating raw `valeur_fonciere` as €/m²** — it is the *total* transaction price; divide by `surface_reelle_bati` for €/m² and filter out land-only mutations (`type_local` = "Terrain").
- **Not paginating** — a Paris-wide query returns ~50k rows per year; cap at 200 for previews and request the full file URL via `get_resource_info` for full analysis.
- **Plotting transactions without dropping outliers** — DVF includes commercial blocs > 50 M€; trim the top 1 % before drawing distributions.
