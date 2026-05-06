---
id: dg-search-datasets
name: Search and explore French open datasets
description: Entry point on data.gouv.fr — search the catalog by keyword, render the results as cards, a recap table, and stat-cards (totals, organisations, last update)
when: the user wants to discover datasets on data.gouv.fr by keyword (air quality, poverty, energy, transport, etc.) without yet knowing a precise dataset id
servers: [datagouv]
tools_used: [search_datasets, get_dataset_info]
data_type: catalogue search results
components_used: [cards, table, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: full-width cards on top, table + stats below
---

## When to use

The user wants to explore the French open data catalog by theme:
- "Quels jeux de données existent sur la qualité de l'air ?"
- "Trouve-moi des datasets INSEE sur la pauvreté"
- "Y a-t-il des données ouvertes sur les pesticides ?"
- "Liste-moi ce qui existe en open data sur le logement"

`data.gouv.fr` indexes ~50 000 datasets. `search_datasets` is the right first step before drilling into a specific dataset.

## How to use

1. **Search by keyword** — keep the query short (the API uses AND logic):
   ```js
   const res = await call('search_datasets', { query: 'qualité air', page_size: 20 }).catch(() => ({ datasets: [], total: 0 }));
   const datasets = res?.datasets ?? [];
   if (datasets.length === 0) {
     await widget('text', { content: 'Aucun dataset trouvé.' });
     return;
   }
   ```

2. **Render the results** as cards + recap table + stats:
   ```js
   await widget('cards', {
     items: datasets.map(d => ({
       title: d.title ?? '—',
       subtitle: d.organization?.name ?? 'Producteur inconnu',
       description: (d.tags ?? []).slice(0, 6).join(', '),
       href: d.url
     }))
   });

   await widget('data-table', {
     columns: ['Titre', 'Organisation', 'Tags', 'Fichiers'],
     rows: datasets.map(d => [d.title ?? '—', d.organization?.name ?? '—', (d.tags ?? []).slice(0, 3).join(', ') || '—', d.resources ?? 0])
   });

   const orgs = new Set(datasets.map(d => d.organization?.name).filter(Boolean));
   const totalResources = datasets.reduce((s, d) => s + (Array.isArray(d.resources) ? d.resources.length : (d.nb_resources ?? 0)), 0);
   await widget('stat-card', { label: 'Résultats', value: res?.total ?? datasets.length, icon: 'database' });
   await widget('stat-card', { label: 'Organisations', value: orgs.size, icon: 'building' });
   await widget('stat-card', { label: 'Fichiers cumulés', value: totalResources, icon: 'file' });
   ```

3. **Optional drill-down** — if the user picks one card, follow up with `get_dataset_info` and the *Dataset profile* recipe (`dg-dataset-profile`).

## Examples

### Air quality datasets
```js
const res = await call('search_datasets', { query: 'qualité air', page_size: 12 }).catch(() => ({ datasets: [], total: 0 }));
await widget('cards', { items: (res?.datasets ?? []).map(d => ({ title: d.title ?? '—', subtitle: d.organization?.name ?? '', description: d.description?.slice(0, 200) ?? '' })) });
await widget('stat-card', { label: 'Datasets', value: res?.total ?? 0 });
```

### INSEE poverty datasets
```js
const res = await call('search_datasets', { query: 'pauvreté INSEE', page_size: 20 }).catch(() => ({ datasets: [] }));
const datasets = res?.datasets ?? [];
await widget('cards', { items: datasets.slice(0, 8).map(d => ({ title: d.title ?? '—', subtitle: d.organization?.name ?? '', description: d.description?.slice(0, 200) ?? '' })) });
await widget('data-table', { columns: ['Titre', 'Fichiers', 'MAJ'], rows: datasets.map(d => [d.title ?? '—', d.resources?.length ?? 0, d.last_modified ?? '—']) });
```

### Renewable energy datasets, sorted by recency
```js
const res = await call('search_datasets', { query: 'énergies renouvelables', page_size: 15 }).catch(() => ({ datasets: [] }));
const sorted = [...(res?.datasets ?? [])].sort((a, b) => (b.last_modified ?? '').localeCompare(a.last_modified ?? ''));
await widget('cards', { items: sorted.slice(0, 6).map(d => ({ title: d.title ?? '—', subtitle: d.organization?.name ?? '', badge: d.last_modified ?? '' })) });
```

## Common mistakes

- **Generic queries return zero results** — `search_datasets({query: "données"})` triggers the AND logic and matches nothing. Prefer specific terms ("DVF", "qualité air", "élections municipales").
- **Forgetting accents** — the API is accent-sensitive: "energie" returns far fewer hits than "énergie". Always pass the user's exact wording.
- **Treating the description as ground truth** — descriptions are free-text from the producer; check `get_dataset_info` before quoting metrics in a final answer.
- **Not paginating** — `page_size` defaults to 20 and caps the result count; pass `page_size: 50` for an exhaustive list, then iterate `page` if `total > page_size`.
- **Confusing datasets with dataservices** — `search_datasets` returns *files*; for third-party APIs (SIRENE, adresse) use `search_dataservices` (recipe `dg-search-dataservices`).
