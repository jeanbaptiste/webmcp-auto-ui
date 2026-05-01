---
id: inat-compare-areas
name: Compare biodiversity between two areas
description: Side-by-side comparison of two places — bar chart of species counts, shared/exclusive species table, paired observation maps and key stats.
when: the user asks to compare two locations, "which has more X", area-vs-area biodiversity, or wants a head-to-head naturalist comparison
servers: [inaturalist]
tools_used: [search_places, species_counts, search_observations]
data_type: cross-area species comparison
components_used: [chart, table, map, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: bar chart full-width, two maps side-by-side, table + stats below
---

## When to use

- "Are there more birds in the Camargue or the Brenne?"
- "Compare biodiversity between Sologne and Dombes"
- "Which has more orchids: the Pyrenees or the Alps?"
- "Compare amphibians between Brittany and Normandy"
- "Side-by-side: Cévennes vs Vosges flora"

## How to use

```js
// 1. Resolve both places
const a = (await call('search_places', { q: 'Camargue', per_page: 1 }))?.results?.[0];
const b = (await call('search_places', { q: 'Brenne', per_page: 1 }))?.results?.[0];
if (!a || !b) {
  await widget('text', { content: 'One or both places not found.' });
  return;
}

// 2. Top species per area
const [topA, topB] = await Promise.all([
  call('species_counts', { place_id: a.id, per_page: 50 }).catch(() => ({ results: [], total_results: 0 })),
  call('species_counts', { place_id: b.id, per_page: 50 }).catch(() => ({ results: [], total_results: 0 })),
]);
const namesA = new Set((topA?.results ?? []).map(r => r.taxon?.name).filter(Boolean));
const namesB = new Set((topB?.results ?? []).map(r => r.taxon?.name).filter(Boolean));
const shared = [...namesA].filter(n => namesB.has(n));
const onlyA = [...namesA].filter(n => !namesB.has(n));
const onlyB = [...namesB].filter(n => !namesA.has(n));

// 3. Observations sample for each map
const [obsA, obsB] = await Promise.all([
  call('search_observations', { place_id: a.id, per_page: 80, quality_grade: 'research' }).catch(() => ({ results: [] })),
  call('search_observations', { place_id: b.id, per_page: 80, quality_grade: 'research' }).catch(() => ({ results: [] })),
]);

// 4. Render comparison chart
await widget('chart', {
  type: 'bar',
  labels: [a.display_name ?? 'Area A', b.display_name ?? 'Area B'],
  data: [topA?.total_results ?? 0, topB?.total_results ?? 0],
  title: 'Species count',
});

// 5. Maps side-by-side
const locA = a.location?.split(',').map(Number) ?? [];
const locB = b.location?.split(',').map(Number) ?? [];
await widget('map', { center: [locA[0], locA[1]], zoom: 9, markers: (obsA?.results ?? []).filter(o => o.geojson?.coordinates).map(o => ({ lat: o.geojson.coordinates[1], lon: o.geojson.coordinates[0] })), title: a.display_name ?? '' });
await widget('map', { center: [locB[0], locB[1]], zoom: 9, markers: (obsB?.results ?? []).filter(o => o.geojson?.coordinates).map(o => ({ lat: o.geojson.coordinates[1], lon: o.geojson.coordinates[0] })), title: b.display_name ?? '' });

// 6. Stats
await widget('stat-card', { label: a.display_name ?? 'Area A', value: (topA?.total_results ?? 0) + ' species', icon: 'leaf' });
await widget('stat-card', { label: b.display_name ?? 'Area B', value: (topB?.total_results ?? 0) + ' species', icon: 'leaf' });
await widget('stat-card', { label: 'Shared species', value: shared.length, icon: 'shuffle' });

// 7. Shared / exclusive table
await widget('table', {
  columns: ['Species', 'Status'],
  rows: [
    ...shared.slice(0, 10).map(s => [s, 'shared']),
    ...onlyA.slice(0, 5).map(s => [s, `only ${a.display_name ?? 'A'}`]),
    ...onlyB.slice(0, 5).map(s => [s, `only ${b.display_name ?? 'B'}`]),
  ],
});
```

## Examples

### Bretagne vs Midi-Pyrénées
```js
const a = (await call('search_places', { q: 'Bretagne', per_page: 1 }))?.results?.[0];
const b = (await call('search_places', { q: 'Midi-Pyrénées', per_page: 1 }))?.results?.[0];
if (!a || !b) { await widget('text', { content: 'Place not found.' }); return; }
const [ca, cb] = await Promise.all([
  call('species_counts', { place_id: a.id, taxon_name: 'Aves', per_page: 50 }).catch(() => ({ total_results: 0 })),
  call('species_counts', { place_id: b.id, taxon_name: 'Aves', per_page: 50 }).catch(() => ({ total_results: 0 })),
]);
await widget('chart', { type: 'bar', labels: [a.display_name ?? 'A', b.display_name ?? 'B'], data: [ca?.total_results ?? 0, cb?.total_results ?? 0] });
```

### Pyrenees vs Alps orchids
```js
const a = (await call('search_places', { q: 'Pyrenees', per_page: 1 }))?.results?.[0];
const b = (await call('search_places', { q: 'Alps', per_page: 1 }))?.results?.[0];
if (!a || !b) { await widget('text', { content: 'Place not found.' }); return; }
const [ca, cb] = await Promise.all([
  call('species_counts', { place_id: a.id, taxon_name: 'Orchidaceae' }).catch(() => ({ total_results: 0 })),
  call('species_counts', { place_id: b.id, taxon_name: 'Orchidaceae' }).catch(() => ({ total_results: 0 })),
]);
await widget('table', { columns: ['Place', 'Orchid species'], rows: [[a.display_name ?? 'A', ca?.total_results ?? 0], [b.display_name ?? 'B', cb?.total_results ?? 0]] });
```

## Common mistakes

- **Different observation effort** between the two places — a smaller park may show fewer species not because of lower richness but because fewer naturalists go there. Disclose this in the commentary
- **Skipping `quality_grade`** — casual obs may differ wildly in quality between places
- **No clade filter** — comparing "all life" between two regions is unreadable; always require a `taxon_name`
- **Shared species computed from `per_page: 10`** — bump to 50 to capture meaningful overlap
- **Maps with different zooms** — pin both maps to the same zoom level for visual fairness
- **Using `place.location` blindly** — it's a `"lat,lng"` string, parse it with `.split(',').map(Number)`
