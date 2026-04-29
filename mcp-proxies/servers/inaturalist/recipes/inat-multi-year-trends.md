---
id: inat-multi-year-trends
name: Multi-year trends for a species
description: Track a species year-over-year — annual observation chart, recent observation map and a journalistic commentary.
when: the user asks if a species is increasing/decreasing, multi-year trend, invasion progress, decline, or population evolution
servers: [inaturalist]
tools_used: [observations_histogram, search_observations, get_taxon, search_taxa]
data_type: annual observation series + recent map
components_used: [chart-rich, map, stat-card, text]
layout:
  type: grid
  columns: 2
  arrangement: chart full-width, map + stats side-by-side, text below
---

## When to use

- "Is the Asian hornet spreading in France?"
- "Are pine processionary moth observations increasing?"
- "Multi-year trend of Eurasian otters"
- "Population evolution of Mediterranean fan worm"
- "Has wolf presence grown in the Alps since 2015?"

## How to use

```js
// 1. Resolve the species
const t = (await call('search_taxa', { q: 'Vespa velutina', per_page: 1 })).results[0];
const detail = await call('get_taxon', { id: t.id });

// 2. Place context (optional but improves trend signal)
const place = (await call('search_places', { q: 'France', per_page: 1 })).results[0];

// 3. Annual histogram (10-year window)
const hist = await call('observations_histogram', {
  taxon_id: t.id, place_id: place.id,
  interval: 'year',
  d1: '2015-01-01', d2: '2025-12-31',
});

// 4. Recent observations for the map
const recent = await call('search_observations', {
  taxon_id: t.id, place_id: place.id,
  d1: '2024-01-01',
  per_page: 200, quality_grade: 'research',
});

// 5. Render the trend
const years = Object.entries(hist.results.year).sort((a, b) => Number(a[0]) - Number(b[0]));
const first = years[0]?.[1] ?? 0;
const last = years.at(-1)?.[1] ?? 0;
const growth = first ? Math.round(((last - first) / first) * 100) : 0;
await widget('chart-rich', {
  type: 'bar',
  title: `${detail.preferred_common_name || detail.name} — annual observations in ${place.display_name}`,
  labels: years.map(([y]) => y),
  data: years.map(([, n]) => n),
  caption: `${growth >= 0 ? '+' : ''}${growth}% from ${years[0][0]} to ${years.at(-1)[0]}.`,
});
await widget('map', {
  zoom: 6,
  cluster: true,
  markers: recent.results.map(o => ({
    lat: o.geojson.coordinates[1],
    lon: o.geojson.coordinates[0],
    label: o.place_guess,
  })),
});
await widget('stat-card', { label: 'Trend (10 yrs)', value: `${growth >= 0 ? '+' : ''}${growth}%`, icon: 'trending-up' });
await widget('stat-card', { label: 'Recent obs (1y)', value: recent.total_results, icon: 'eye' });
await widget('text', {
  content: detail.wikipedia_summary
    ? detail.wikipedia_summary.slice(0, 400) + '…'
    : 'No Wikipedia summary available.',
});
```

## Examples

### Pine processionary moth in France
```js
const t = (await call('search_taxa', { q: 'Thaumetopoea pityocampa', per_page: 1 })).results[0];
const place = (await call('search_places', { q: 'France', per_page: 1 })).results[0];
const hist = await call('observations_histogram', { taxon_id: t.id, place_id: place.id, interval: 'year', d1: '2010-01-01' });
await widget('chart-rich', { type: 'bar', labels: Object.keys(hist.results.year), data: Object.values(hist.results.year) });
```

### Otter recovery
```js
const t = (await call('search_taxa', { q: 'Lutra lutra', per_page: 1 })).results[0];
const hist = await call('observations_histogram', { taxon_id: t.id, interval: 'year', d1: '2015-01-01' });
await widget('chart-rich', { type: 'line', labels: Object.keys(hist.results.year), data: Object.values(hist.results.year) });
```

## Common mistakes

- **Reading a trend as biological reality** — iNaturalist usage exploded post-2017, so most species "increase" simply because of more observers. Always frame as "reported observations", not "population"
- **Not setting `d1`** — you'll get the entire history including very sparse early years that distort the chart
- **Yearly interval without enough years** — under 5 data points is not a trend, it's noise
- **No place filter** — global trends are dominated by the most active country; constrain to a region for meaningful patterns
- **Forgetting the `caption`** — readers need the methodological caveat (observation effort vs population)
- **Showing a percentage growth** without disclaimer — `+800% in 5 years` may look dramatic but mostly reflects platform growth
