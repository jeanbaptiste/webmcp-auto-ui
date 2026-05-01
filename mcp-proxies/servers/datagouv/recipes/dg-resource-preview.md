---
id: dg-resource-preview
name: Tabular preview of a CSV/XLSX resource
description: Render the first 20-50 rows of a tabular resource via the Tabular API, plus stat-cards on column count, total rows and format
when: the user wants to inspect what a CSV/XLSX file actually contains before downloading it or running a heavier query
servers: [datagouv]
tools_used: [get_resource_info, query_resource_data]
data_type: tabular preview (20-50 rows)
components_used: [table, stat-card, text]
layout:
  type: grid
  columns: 2
  arrangement: text + stats top, full-width table below
---

## When to use

The user wants a quick look at the structure of a resource:
- "Montre-moi les premières lignes du fichier CSV des subventions associatives"
- "À quoi ressemblent les données DVF ?"
- "Affiche un échantillon de la base SIRENE"
- "Quelles colonnes a ce fichier ?"

The Tabular API returns the schema and a paged sample without downloading the file.

## How to use

1. **Verify Tabular API availability**:
   ```js
   // Discover a CSV resource from DVF (fallback if no resource_id given)
   const resList = await call('list_dataset_resources', { dataset_id: '5cc1b94a634f4165e96436c1' }).catch(() => ({ resources: [] }));
   const csvRes = (resList?.resources ?? []).find(r => r.format === 'csv') ?? (resList?.resources ?? [])[0];
   const resource_id = csvRes?.id ?? '';
   const info = resource_id ? await call('get_resource_info', { resource_id }).catch(() => null) : null;
   if (!info) {
     await widget('text', { content: 'Ressource introuvable.' });
   } else if (!info.tabular_available) {
     await widget('text', { content: 'API Tabular indisponible pour cette ressource — télécharger directement.' });
   }
   ```

2. **Query a small page**:
   ```js
   const sample = await call('query_resource_data', { resource_id, page_size: 20 }).catch(() => ({ rows: [], columns: [], total: 0 }));
   ```

3. **Render schema + preview**:
   ```js
   const I = info ?? {};
   await widget('text', {
     title: I.title ?? '—',
     content: `Format ${I.format ?? '—'} · ${I.size_human ?? '—'}`
   });
   await widget('stat-card', { label: 'Colonnes', value: sample?.columns?.length ?? 1, icon: 'columns' });
   await widget('stat-card', { label: 'Lignes (total)', value: sample?.total ?? 1, icon: 'list' });
   await widget('stat-card', { label: 'Format', value: I.format ?? '—', icon: 'file' });

   const tableCols = sample?.columns ?? [];
   const tableRows = (sample?.rows ?? []).map(r => tableCols.map(c => r[c] ?? '—'));
   await widget('table', {
     columns: tableCols,
     rows: tableRows
   });
   ```

## Examples

### Preview a CSV from DVF (auto-discovery)
```js
const resList = await call('list_dataset_resources', { dataset_id: '5cc1b94a634f4165e96436c1' }).catch(() => ({ resources: [] }));
const csvRes = (resList?.resources ?? []).find(r => r.format === 'csv') ?? (resList?.resources ?? [])[0];
if (!csvRes) { await widget('text', { content: 'Aucune ressource trouvée.' }); return; }
const sample = await call('query_resource_data', { resource_id: csvRes.id, page_size: 20 }).catch(() => ({ rows: [], columns: [], total: 0 }));
await widget('table', { columns: sample?.columns ?? [], rows: (sample?.rows ?? []).map(r => (sample.columns ?? []).map(c => r[c] ?? '—')) });
await widget('stat-card', { label: 'Total lignes', value: sample?.total ?? 0 });
```

### Preview using the first tabular resource of any dataset
```js
const search = await call('search_datasets', { query: 'subventions', page_size: 1 }).catch(() => ({ datasets: [] }));
const ds_id = search?.datasets?.[0]?.id;
const resList2 = ds_id ? await call('list_dataset_resources', { dataset_id: ds_id }).catch(() => ({ resources: [] })) : { resources: [] };
const csvRes2 = (resList2?.resources ?? []).find(r => r.format === 'csv') ?? (resList2?.resources ?? [])[0];
const sample2 = csvRes2 ? await call('query_resource_data', { resource_id: csvRes2.id, page_size: 30 }).catch(() => ({ rows: [], columns: [], total: 0 })) : { rows: [], columns: [], total: 0 };
await widget('text', { title: search?.datasets?.[0]?.title ?? 'Aperçu', content: `${sample2?.total ?? 0} lignes au total` });
await widget('table', { columns: sample2?.columns ?? [], rows: (sample2?.rows ?? []).map(r => (sample2.columns ?? []).map(c => r[c] ?? '—')) });
```

### Preview filtered to a single column value
```js
// Subventions régionales aux associations (dataset 66dbcfce36f23a6cf922771c, ~23k lignes)
const sample3 = await call('query_resource_data', {
  resource_id: '58075a79-8b16-4004-9640-6413c1dc2d60',
  page_size: 25
}).catch(() => ({ rows: [], columns: [] }));
await widget('table', { columns: sample3?.columns ?? [], rows: (sample3?.rows ?? []).map(r => (sample3.columns ?? []).map(c => r[c] ?? '—')) });
```

## Common mistakes

- **Skipping `get_resource_info`** — not every CSV is registered with the Tabular API (older or malformed files); calling `query_resource_data` straight away returns a 404.
- **Page size too high** — `page_size: 1000` will time out on wide tables; stay at 20-50 for previews.
- **Assuming column names are stable** — schemas evolve; never hardcode them across yearly archives without re-checking.
- **Confusing `total` with `page_size`** — `total` is the dataset-wide count, the table only renders `rows.length`.
- **Forgetting encoding edge cases** — French open data CSVs are sometimes Latin-1; the Tabular API normalises to UTF-8 but the raw URL may not.
