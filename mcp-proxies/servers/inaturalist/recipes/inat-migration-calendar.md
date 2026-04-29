---
id: inat-migration-calendar
name: Migration calendar of a species
description: Build a fine-grained migration calendar — weekly histogram, key milestone timeline, hotspot map and headline stats.
when: the user asks when birds migrate, migration calendar, weekly arrival pattern, or fine-grained seasonal movement
servers: [inaturalist]
tools_used: [observations_histogram, search_observations, get_taxon, search_taxa, search_places]
data_type: weekly observations + spatial pattern
components_used: [timeline, chart, map, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: timeline full-width, chart + map side-by-side, stats below
---

## When to use

- "When do common cranes migrate through France?"
- "Migration calendar of the white stork"
- "Arrival timing of barn swallows in Brittany"
- "When can I see the European bee-eater?"
- "Migration windows for the European pied flycatcher"

## How to use

```js
// 1. Resolve species + place
const t = (await call('search_taxa', { q: 'Grus grus', per_page: 1 })).results[0];
const detail = await call('get_taxon', { id: t.id });
const place = (await call('search_places', { q: 'France', per_page: 1 })).results[0];

// 2. Weekly histogram
const hist = await call('observations_histogram', {
  taxon_id: t.id,
  place_id: place.id,
  interval: 'week',
  quality_grade: 'research',
});

// 3. Recent observations (for hotspot map)
const recent = await call('search_observations', {
  taxon_id: t.id, place_id: place.id,
  per_page: 200, quality_grade: 'research',
});

// 4. Detect migration peaks (top 3 weeks)
const weeks = Object.entries(hist.results.week)
  .map(([k, v]) => ({ week: k, count: v }))
  .sort((a, b) => b.count - a.count);
const peaks = weeks.slice(0, 3).sort((a, b) => a.week.localeCompare(b.week));

// 5. Render
await widget('timeline', {
  events: peaks.map(p => ({
    title: `Peak: ${p.count} obs`,
    subtitle: p.week,
    icon: 'feather',
  })),
});
await widget('chart', {
  type: 'line',
  title: `${detail.preferred_common_name || detail.name} — weekly observations`,
  labels: Object.keys(hist.results.week),
  data: Object.values(hist.results.week),
});
await widget('map', {
  zoom: 6,
  cluster: true,
  markers: recent.results.map(o => ({
    lat: o.geojson.coordinates[1],
    lon: o.geojson.coordinates[0],
    label: o.observed_on,
  })),
});
await widget('stat-card', { label: 'Migration peaks', value: peaks.length, icon: 'trending-up' });
await widget('stat-card', { label: 'Top week', value: peaks[0]?.week || '—', icon: 'calendar' });
await widget('stat-card', { label: 'Total observations', value: recent.total_results, icon: 'eye' });
```

## Examples

### White stork in France
```js
const t = (await call('search_taxa', { q: 'Ciconia ciconia', per_page: 1 })).results[0];
const place = (await call('search_places', { q: 'France', per_page: 1 })).results[0];
const hist = await call('observations_histogram', { taxon_id: t.id, place_id: place.id, interval: 'week' });
await widget('chart', { type: 'line', labels: Object.keys(hist.results.week), data: Object.values(hist.results.week) });
```

### Bee-eater calendar
```js
const t = (await call('search_taxa', { q: 'Merops apiaster', per_page: 1 })).results[0];
const hist = await call('observations_histogram', { taxon_id: t.id, interval: 'week' });
const obs = await call('search_observations', { taxon_id: t.id, per_page: 100, quality_grade: 'research' });
await widget('map', { zoom: 4, cluster: true, markers: obs.results.map(o => ({ lat: o.geojson.coordinates[1], lon: o.geojson.coordinates[0] })) });
```

## Common mistakes

- **Using `interval: "month"` for migration** — month-resolution misses the actual 1-2 week migration windows
- **Reading week keys as integers** — they look like `"2024-W18"` or simply `"18"` depending on the version; sort lexicographically and don't `parseInt`
- **No place filter** — global migration patterns blur because spring/fall happen in different hemispheres
- **Skipping the timeline** — a weekly chart alone is hard to read; the timeline highlights the 2-3 milestone weeks
- **Plotting all observations regardless of date** — if you want recent activity, restrict with `d1`/`d2` to the current year
- **Confusing `week.observed_on` with `week.created_at`** — for migration always use `date_field: "observed_on"` (the default)
