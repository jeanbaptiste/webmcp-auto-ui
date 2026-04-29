---
id: dg-theme-recent
name: Theme catalog with recent updates
description: Browse a thematic search sorted by recency — cards of the 12 most recent datasets, timeline of monthly publications, stat-cards on volume and formats
when: the user wants a thematic monitoring view (what is new on theme X this month?)
servers: [datagouv]
tools_used: [search_datasets, get_dataset_info]
data_type: recently updated datasets
components_used: [cards, timeline, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: cards full-width, timeline + stats below
---

## When to use

The user wants thematic monitoring — what is new in open data:
- "Datasets récents publiés sur l'éducation"
- "Quoi de neuf en open data transport ce mois-ci ?"
- "Quelles données ouvertes sur le climat sont sorties cette année ?"
- "Veille open data santé"

Useful for editorial dashboards and SHS researchers tracking publication patterns.

## How to use

1. **Search and sort by recency client-side** (the API search has limited sort options):
   ```js
   const res = await call('search_datasets', { query: 'transport', page_size: 50 }).catch(() => ({ datasets: [] }));
   const sorted = [...(res?.datasets ?? [])].sort((a, b) => (b.last_modified ?? '').localeCompare(a.last_modified ?? ''));
   const recent = sorted.slice(0, 12);
   if (recent.length === 0) {
     await widget('text', { content: 'Aucun dataset récent.' });
     return;
   }
   ```

2. **Build the monthly timeline** of MAJ from the 50 results:
   ```js
   const byMonth = sorted.reduce((acc, d) => {
     const m = (d.last_modified ?? '').slice(0, 7);
     if (!m) return acc;
     acc[m] = (acc[m] ?? 0) + 1;
     return acc;
   }, {});
   const timeline = Object.entries(byMonth).sort().map(([month, count]) => ({ date: month, label: `${count} MAJ` }));
   ```

3. **Render**:
   ```js
   await widget('cards', {
     items: recent.map(d => ({
       title: d.title ?? '—',
       subtitle: d.organization?.name ?? '',
       description: d.description?.slice(0, 160) ?? '',
       badge: d.last_modified ?? ''
     }))
   });

   await widget('timeline', { items: timeline });

   const formats = new Set(sorted.map(d => d.main_format).filter(Boolean));
   await widget('stat-card', { label: 'Datasets', value: sorted.length, icon: 'database' });
   await widget('stat-card', { label: 'Organisations', value: new Set(sorted.map(d => d.organization?.id)).size, icon: 'building' });
   await widget('stat-card', { label: 'Formats distincts', value: formats.size, icon: 'file' });
   ```

## Examples

### Latest education datasets
```js
const res = await call('search_datasets', { query: 'éducation', page_size: 50 }).catch(() => ({ datasets: [] }));
const recent = [...(res?.datasets ?? [])].sort((a, b) => (b.last_modified ?? '').localeCompare(a.last_modified ?? '')).slice(0, 12);
await widget('cards', { items: recent.map(d => ({ title: d.title ?? '—', subtitle: d.organization?.name ?? '', badge: d.last_modified ?? '' })) });
```

### Transport open data this month
```js
const res = await call('search_datasets', { query: 'transport', page_size: 50 }).catch(() => ({ datasets: [] }));
const thisMonth = (res?.datasets ?? []).filter(d => (d.last_modified ?? '').startsWith('2026-04'));
await widget('cards', { items: thisMonth.map(d => ({ title: d.title ?? '—', subtitle: d.organization?.name ?? '' })) });
await widget('stat-card', { label: 'Publiés ce mois', value: thisMonth.length });
```

## Common mistakes

- **Treating `last_modified` as the publication date** — it is the file's last update, not the dataset creation. Use `info.created_at` for "newly created" framing.
- **Filtering on a too-narrow window** — open data publication is bursty; widen to 3 months for niche themes.
- **Trusting the description for the actual date** — many descriptions still mention "2018"; rely on `last_modified` only.
- **Showing duplicate datasets across themes** — broad themes (`transport`, `santé`) cover overlapping search results; dedupe by `dataset.id`.
- **Forgetting empty-result fallback** — if no result this month, surface the previous month with a clear caption rather than "0 datasets".
