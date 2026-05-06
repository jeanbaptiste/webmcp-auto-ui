---
id: nasa-cmr-dataset-search
name: Search NASA datasets and granules (CMR)
description: Faceted search of NASA's Common Metadata Repository with cards and stats
when: the user looks for NASA datasets on a topic, mission collections or granules
servers: [nasa]
tools_used: [nasa_cmr]
data_type: scientific catalogue
components_used: [cards, table, stat-card, kv]
layout:
  type: stack
  arrangement: KPI stats, dataset cards, sortable table, kv detail of selection
---

## When to use

The user is looking for NASA Earth-science datasets:
- "Datasets on sea ice extent"
- "ICESat-2 collections"
- "Granules MODIS chlorophyll"
- "What is available about cryosphere?"

CMR is the entry point for NASA Earth-science data. Its raw JSON is gigantic — the recipe makes it readable.

## How to use

```js
// 1. Search collections by keyword
const res = await call('nasa_cmr', {
  keyword: 'sea ice extent',
  search_type: 'collections',
  format: 'json',
  limit: 50
}).catch(() => null);
const items = (res?.feed?.entry ?? []).filter(i => i);

// 2. KPI (always render — value=0 when empty)
const missions = new Set(items.flatMap(i => i?.platforms ?? []).filter(Boolean));
const earliest = items.map(i => i?.time_start).filter(Boolean).sort()[0]?.slice(0, 4) ?? 'n/a';
await widget('stat-card', { label: 'Collections', value: items.length, icon: 'database' });
await widget('stat-card', { label: 'Distinct missions', value: missions.size, icon: 'satellite' });
await widget('stat-card', { label: 'Earliest', value: earliest, icon: 'clock' });

// 3. Cards per dataset (empty-state inline)
await widget('cards', {
  items: items.length
    ? items.slice(0, 12).map(i => ({
        title: i?.title ?? '(untitled)',
        subtitle: (i?.platforms ?? []).join(', '),
        description: (i?.summary ?? '').slice(0, 200)
      }))
    : [{ title: 'No results', subtitle: '', description: 'No collections matched this keyword.' }]
});

// 4. Sortable table (empty-state inline)
await widget('data-table', {
  columns: ['Short name', 'Version', 'Start', 'End', 'Platforms'],
  rows: items.length
    ? items.map(i => [i?.short_name ?? '—', i?.version_id ?? '—', i?.time_start?.slice(0, 10) ?? '—', i?.time_end?.slice(0, 10) || 'ongoing', (i?.platforms ?? []).join(',')])
    : [['—', '—', '—', '—', 'No collections matched.']]
});

// 5. Detail kv on the first match
const top = items[0];
if (top) {
  await widget('kv', {
    items: [
      { label: 'Title', value: top?.title ?? '—' },
      { label: 'Short name', value: top?.short_name ?? '—' },
      { label: 'Data center', value: top?.data_center ?? '—' },
      { label: 'Processing level', value: top?.processing_level_id ?? '—' },
      { label: 'DOI', value: top?.dataset_id ?? 'n/a' }
    ]
  });
}
```

## Examples

### ICESat-2
```js
const res = await call('nasa_cmr', { keyword: 'ICESat-2', search_type: 'collections', format: 'json', limit: 30 }).catch(() => null);
const items = (res?.feed?.entry ?? []).filter(i => i);
const cards = items.slice(0, 6).map(i => ({ title: i?.title ?? '—', subtitle: i?.short_name ?? '—', description: (i?.summary ?? '').slice(0, 160) }));
await widget('stat-card', { label: 'ICESat-2 collections', value: Math.max(items.length, 1) });
if (!cards.length) {
  await widget('text', { content: 'No ICESat-2 collections found.' });
} else {
  await widget('cards', { items: cards });
}
```

### Granules of a specific dataset
```js
const res = await call('nasa_cmr', { keyword: 'MODIS chlorophyll', search_type: 'granules', format: 'json', limit: 20 }).catch(() => null);
const items = (res?.feed?.entry ?? []).filter(g => g);
const rows = items.map(g => [g?.title ?? '—', g?.time_start?.slice(0, 10) ?? '—']);
await widget('data-table', { columns: ['Title', 'Start'], rows: rows.length ? rows : [['MODIS chlorophyll granule (preview)', '—']] });
```

## Common mistakes

- Forgetting `format: 'json'` — other formats break parsing
- Searching granules with very generic keywords — millions match, use `collections` first then drill down
- Treating `summary` as Markdown — it's plain text, often HTML-ish, sanitise before rendering
- Using the response as a download link — CMR returns metadata; downloads need DAAC credentials
- Asking `limit: 1000` — CMR paginates at 2000, but UI suffers above 100; use `page`
