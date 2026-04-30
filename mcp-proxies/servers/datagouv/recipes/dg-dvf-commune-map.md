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
   // Pick the resource for the year of interest (e.g. 2023), fallback to any CSV
   const resource = (resList?.resources ?? []).find(r => r.title?.includes('2023') && r.format === 'csv')
     ?? (resList?.resources ?? []).find(r => r.format === 'csv')
     ?? (resList?.resources ?? [])[0];
   if (!resource) {
     await widget('text', { content: 'Ressource DVF introuvable.' });
   }
   ```

2. **Filter by commune code**:
   ```js
   const tx = resource ? await call('query_resource_data', {
     resource_id: resource.id,
     filter_column: 'code_commune',
     filter_value: '13055', // Marseille
     page_size: 200
   }).catch(() => ({ rows: [] })) : { rows: [] };
   const rows = tx?.rows ?? [];
   if (rows.length === 0) {
     await widget('text', { content: 'Aucune transaction trouvée.' });
   }
   ```

3. **Compute aggregates and render**:
   ```js
   const prices = rows.map(r => Number(r.valeur_fonciere)).filter(Number.isFinite).sort((a, b) => a - b);
   const median = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;
   const avg = prices.length > 0 ? prices.reduce((s, x) => s + x, 0) / prices.length : 0;

   await widget('map', {
     center: [43.2965, 5.3698],
     zoom: 12,
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

   await widget('table', {
     columns: ['Date', 'Type', 'Surface', 'Prix', 'Adresse'],
     rows: [...rows]
       .sort((a, b) => (Number(b.valeur_fonciere) || 0) - (Number(a.valeur_fonciere) || 0))
       .slice(0, 10)
       .map(r => [r.date_mutation ?? '—', r.type_local ?? '—', `${r.surface_reelle_bati ?? '—'} m²`, Number.isFinite(Number(r.valeur_fonciere)) ? `${Number(r.valeur_fonciere).toLocaleString('fr-FR')} €` : '—', `${r.adresse_numero ?? ''} ${r.adresse_nom_voie ?? ''}`.trim() || '—'])
   });

   // Price distribution histogram
   const buckets = [0, 100_000, 250_000, 500_000, 1_000_000, Infinity];
   const counts = buckets.slice(0, -1).map((lo, i) => prices.filter(p => p >= lo && p < buckets[i + 1]).length);
   await widget('chart', {
     type: 'bar',
     data: { labels: ['<100k', '100-250k', '250-500k', '500k-1M', '>1M'], values: counts }
   });
   ```

## Examples

### Marseille (auto-discovery DVF CSV)
```js
const dvfList = await call('list_dataset_resources', { dataset_id: '5cc1b94a634f4165e96436c1' }).catch(() => ({ resources: [] }));
const dvfCsv = (dvfList?.resources ?? []).find(r => r.format === 'csv') ?? (dvfList?.resources ?? [])[0];
const tx = dvfCsv ? await call('query_resource_data', {
  resource_id: dvfCsv.id,
  filter_column: 'code_commune',
  filter_value: '13055',
  page_size: 200
}).catch(() => ({ rows: [] })) : { rows: [] };
await widget('map', { center: [43.2965, 5.3698], zoom: 12, markers: (tx?.rows ?? []).filter(r => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))).map(r => ({ lat: Number(r.latitude), lon: Number(r.longitude) })) });
```

### Top sales in Bordeaux (auto-discovery DVF CSV)
```js
const dvfList2 = await call('list_dataset_resources', { dataset_id: '5cc1b94a634f4165e96436c1' }).catch(() => ({ resources: [] }));
const dvfCsv2 = (dvfList2?.resources ?? []).find(r => r.format === 'csv') ?? (dvfList2?.resources ?? [])[0];
const tx2 = dvfCsv2 ? await call('query_resource_data', {
  resource_id: dvfCsv2.id,
  filter_column: 'code_commune',
  filter_value: '33063',
  sort_column: 'valeur_fonciere',
  sort_direction: 'desc',
  page_size: 10
}).catch(() => ({ rows: [] })) : { rows: [] };
await widget('table', { columns: ['Date', 'Type', 'Prix'], rows: (tx2?.rows ?? []).map(r => [r.date_mutation ?? '—', r.type_local ?? '—', r.valeur_fonciere ?? '—']) });
```

## Common mistakes

- **Filtering on `nom_commune`** — names are not unique (Saint-Denis, La Roche…). Always filter on `code_commune` (INSEE 5-digit code).
- **Forgetting Paris / Lyon / Marseille arrondissements** — Marseille is `13055` but its 16 arrondissements have their own codes (`13201`-`13216`); decide which level the user wants.
- **Treating raw `valeur_fonciere` as €/m²** — it is the *total* transaction price; divide by `surface_reelle_bati` for €/m² and filter out land-only mutations (`type_local` = "Terrain").
- **Not paginating** — a Paris-wide query returns ~50k rows per year; cap at 200 for previews and request the full file URL via `get_resource_info` for full analysis.
- **Plotting transactions without dropping outliers** — DVF includes commercial blocs > 50 M€; trim the top 1 % before drawing distributions.
