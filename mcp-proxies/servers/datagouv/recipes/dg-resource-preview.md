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
   const info = await call('get_resource_info', { resource_id });
   if (!info.tabular_api_available) {
     throw new Error('Tabular API not available for this resource — fetch the URL directly.');
   }
   ```

2. **Query a small page**:
   ```js
   const sample = await call('query_resource_data', { resource_id, page_size: 20 });
   ```

3. **Render schema + preview**:
   ```js
   await widget('text', {
     title: info.title,
     content: `Format ${info.format} · ${info.size_human}`
   });
   await widget('stat-card', { label: 'Colonnes', value: sample.columns?.length ?? 0, icon: 'columns' });
   await widget('stat-card', { label: 'Lignes (total)', value: sample.total ?? '—', icon: 'list' });
   await widget('stat-card', { label: 'Format', value: info.format, icon: 'file' });

   await widget('table', {
     columns: sample.columns,
     rows: sample.rows
   });
   ```

## Examples

### Preview the DVF 2023 file
```js
const resource_id = '0ab442c4-5fe3-4a78-bdde-ed10073cf69c'; // DVF 2023 CSV
const info = await call('get_resource_info', { resource_id });
const sample = await call('query_resource_data', { resource_id, page_size: 20 });
await widget('table', { columns: sample.columns, rows: sample.rows });
await widget('stat-card', { label: 'Total transactions', value: sample.total });
```

### Preview a subventions associatives CSV
```js
const sample = await call('query_resource_data', { resource_id: 'abc-123-def', page_size: 30 });
await widget('text', { title: 'Subventions associatives', content: `${sample.total} lignes au total` });
await widget('table', { columns: sample.columns, rows: sample.rows });
```

### Preview filtered to a single column value
```js
const sample = await call('query_resource_data', {
  resource_id: 'abc-123',
  filter_column: 'departement',
  filter_value: '75',
  page_size: 25
});
await widget('table', { columns: sample.columns, rows: sample.rows });
```

## Common mistakes

- **Skipping `get_resource_info`** — not every CSV is registered with the Tabular API (older or malformed files); calling `query_resource_data` straight away returns a 404.
- **Page size too high** — `page_size: 1000` will time out on wide tables; stay at 20-50 for previews.
- **Assuming column names are stable** — schemas evolve; never hardcode them across yearly archives without re-checking.
- **Confusing `total` with `page_size`** — `total` is the dataset-wide count, the table only renders `rows.length`.
- **Forgetting encoding edge cases** — French open data CSVs are sometimes Latin-1; the Tabular API normalises to UTF-8 but the raw URL may not.
