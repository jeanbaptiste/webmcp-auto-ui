---
id: inat-global-range
name: World distribution of a species
description: Map the global distribution of a taxon, break down observations by continent and surface key facts.
when: the user asks where a species lives, its global range, world distribution, native habitat, or biogeography
servers: [inaturalist]
tools_used: [search_taxa, get_taxon, search_observations]
data_type: world distribution + continent histogram
components_used: [map, chart, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: world map full-width, chart + kv side-by-side, stats below
---

## When to use

- "Where does the red panda live?"
- "Range of the grey wolf"
- "Global distribution of the greater flamingo"
- "Where is the snow leopard found?"
- "Native range of the Iberian lynx"

## How to use

```js
// 1. Resolve the species
const t = (await call('search_taxa', { q: 'Phoenicopterus roseus', per_page: 1 }))?.results?.[0];
if (!t) {
  await widget('text', { content: 'Species not found.' });
  return;
}
const detail = await call('get_taxon', { id: t.id }).catch(() => null);

// 2. Pull a wide sample of observations to plot the global range
const obs = await call('search_observations', {
  taxon_id: t.id, quality_grade: 'research', per_page: 200,
}).catch(() => ({ results: [] }));

// 3. Break observations down by continent (rough longitude buckets)
const continents = { Africa: 0, Europe: 0, Asia: 0, Americas: 0, Oceania: 0 };
const geoResults = (obs?.results ?? []).filter(o => o.geojson?.coordinates);
for (const o of geoResults) {
  const lon = o.geojson.coordinates[0];
  const lat = o.geojson.coordinates[1];
  if (lat < -10 && lon > 110) continents.Oceania++;
  else if (lon < -30) continents.Americas++;
  else if (lon < 40 && lat > 35) continents.Europe++;
  else if (lon < 50 && lat <= 35) continents.Africa++;
  else continents.Asia++;
}

// 4. Render
await widget('map', {
  zoom: 2,
  cluster: true,
  markers: geoResults.map(o => ({
    lat: o.geojson.coordinates[1],
    lon: o.geojson.coordinates[0],
    label: o.place_guess ?? '',
  })),
});
await widget('chart', {
  title: 'Observations by continent',
  bars: Object.entries(continents).map(([label, value]) => [label, value]),
});
await widget('kv', {
  title: detail?.preferred_common_name ?? detail?.name ?? t.name ?? 'Species',
  rows: [
    ['Scientific name', detail?.name ?? t.name ?? '—'],
    ['Family', detail?.ancestors?.find(a => a.rank === 'family')?.name ?? '—'],
    ['Conservation status', detail?.conservation_status?.status_name ?? 'Least concern'],
  ],
});
await widget('stat-card', { label: 'Plotted observations', value: geoResults.length, icon: 'globe' });
await widget('stat-card', { label: 'Total iNat observations', value: detail?.observations_count ?? 0, icon: 'eye' });
```

## Examples

### Grey wolf range
```js
const t = (await call('search_taxa', { q: 'Canis lupus', per_page: 1 }))?.results?.[0];
if (!t) { await widget('text', { content: 'Species not found.' }); return; }
const obs = await call('search_observations', { taxon_id: t.id, quality_grade: 'research', per_page: 200 }).catch(() => ({ results: [] }));
await widget('map', { zoom: 2, cluster: true, markers: (obs?.results ?? []).filter(o => o.geojson?.coordinates).map(o => ({ lat: o.geojson.coordinates[1], lon: o.geojson.coordinates[0] })) });
```

### Red panda (constrained range)
```js
const t = (await call('search_taxa', { q: 'red panda', per_page: 1 }))?.results?.[0];
if (!t) { await widget('text', { content: 'Species not found.' }); return; }
const detail = await call('get_taxon', { id: t.id }).catch(() => null);
const obs = await call('search_observations', { taxon_id: t.id, per_page: 100, quality_grade: 'research' }).catch(() => ({ results: [] }));
await widget('kv', { title: detail?.preferred_common_name ?? detail?.name ?? 'Species', rows: [['Conservation', detail?.conservation_status?.status_name ?? 'Least concern']] });
await widget('map', { zoom: 4, markers: (obs?.results ?? []).filter(o => o.geojson?.coordinates).map(o => ({ lat: o.geojson.coordinates[1], lon: o.geojson.coordinates[0] })) });
```

## Common mistakes

- **Plotting `per_page: 30`** for a global range — the map looks empty; pull at least 100-200 observations
- **Not using map clustering** at low zoom — markers overlap and the distribution becomes unreadable
- **Trusting iNaturalist for true range** — observations show *where iNat users go*, not the full biological range; many areas are under-sampled
- **Crude continent bucketing** — the example above is rough; for serious analysis use a real geocoder or `nearby_places`
- **Mixing casual + research observations** at world scale — research grade gives a cleaner picture
- **Ignoring vagrants** — a single point in Australia for a European species may be a wandering individual, not part of the range
