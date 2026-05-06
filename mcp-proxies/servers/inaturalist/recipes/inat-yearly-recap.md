---
id: inat-yearly-recap
name: Yearly naturalist recap
description: A "wrapped"-style recap of one year — KPIs, monthly chart, iconic group split, best-of gallery and top contributors.
when: the user asks for a yearly recap, annual summary, "wrapped" style report, or end-of-year naturalist bilan
servers: [inaturalist]
tools_used: [search_observations, observations_histogram, iconic_taxa_counts, observers_leaderboard, search_places]
data_type: multi-axis annual aggregation
components_used: [stat-card, chart-rich, gallery, table]
layout:
  type: grid
  columns: 2
  arrangement: stat row top, chart full-width, gallery + table below
---

## When to use

- "iNaturalist 2025 recap for France"
- "Year-end report Belgium 2024"
- "What did naturalists observe this year in Spain?"
- "Annual summary of the Vosges park"
- "Wrapped-style bilan for the Cévennes"

## How to use

```js
// 1. Place + year
const place = (await call('search_places', { q: 'France', per_page: 1 }))?.results?.[0];
if (!place) {
  await widget('text', { content: 'Place not found.' });
  return;
}
const year = 2025;
const d1 = `${year}-01-01`, d2 = `${year}-12-31`;

// 2. Aggregations in parallel
const [allObs, hist, breakdown, board, best] = await Promise.all([
  call('search_observations', { place_id: place.id, d1, d2, per_page: 1, quality_grade: 'research' }).catch(() => ({ total_results: 0 })),
  call('observations_histogram', { place_id: place.id, d1, d2, interval: 'month', quality_grade: 'research' }).catch(() => ({ results: { month: {} } })),
  call('iconic_taxa_counts', { place_id: place.id, d1, d2, quality_grade: 'research' }).catch(() => ({ results: [] })),
  call('observers_leaderboard', { place_id: place.id, d1, d2, per_page: 5 }).catch(() => ({ results: [] })),
  call('search_observations', { place_id: place.id, d1, d2, per_page: 50, quality_grade: 'research' }).catch(() => ({ results: [] })),
]);

// 7. Render KPIs
const totalSpecies = (breakdown?.results ?? []).reduce((s, r) => s + (r.count ?? 0), 0);
await widget('stat-card', { label: `Observations ${year}`, value: allObs?.total_results ?? 0, icon: 'eye' });
await widget('stat-card', { label: 'Unique species', value: totalSpecies, icon: 'leaf' });
await widget('stat-card', { label: 'Top contributor', value: board?.results?.[0]?.user?.login ?? '—', icon: 'star' });
await widget('stat-card', { label: 'Place', value: place.display_name ?? '—', icon: 'map' });

// 8. Monthly chart
const monthData = hist?.results?.month ?? {};
await widget('chart-rich', {
  type: 'bar',
  title: `${place.display_name ?? 'Region'} — observations per month in ${year}`,
  labels: Object.keys(monthData),
  data: Object.values(monthData),
  caption: `${allObs?.total_results ?? 0} research-grade observations across the year.`,
});

// 9. Best-of gallery
const galleryImages = (best?.results ?? [])
  .slice(0, 7)
  .map(o => {
    const hasPhoto = o.photos?.length > 0 && o.photos[0]?.url;
    return {
      src: hasPhoto ? o.photos[0].url.replace('square', 'large') : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="500"%3E%3Crect fill="%23e5e7eb" width="500" height="500"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="24" fill="%23999"%3E[No photo]%3C/text%3E%3C/svg%3E',
      caption: `${o.species_guess ?? o.taxon?.name ?? 'Unknown'} — ${o.observed_on ?? '—'}`,
    };
  });
await widget('gallery', { images: galleryImages });

// 10. Contributor leaderboard
await widget('data-table', {
  columns: ['Rank', 'User', 'Species', 'Observations'],
  rows: (board?.results ?? []).map((r, i) => [i + 1, r.user?.login ?? '—', r.species_count ?? 0, r.observation_count ?? 0]),
});
```

## Examples

### Belgium 2024
```js
const place = (await call('search_places', { q: 'Belgium', per_page: 1 }))?.results?.[0];
if (!place) { await widget('text', { content: 'Place not found.' }); return; }
const hist = await call('observations_histogram', { place_id: place.id, d1: '2024-01-01', d2: '2024-12-31', interval: 'month' }).catch(() => ({ results: { month: {} } }));
const m = hist?.results?.month ?? {};
await widget('chart-rich', { type: 'bar', labels: Object.keys(m), data: Object.values(m) });
```

### Cevennes wrapped
```js
const place = (await call('search_places', { q: 'Cévennes', per_page: 1 }))?.results?.[0];
if (!place) { await widget('text', { content: 'Place not found.' }); return; }
const board = await call('observers_leaderboard', { place_id: place.id, d1: '2025-01-01', d2: '2025-12-31', per_page: 10 }).catch(() => ({ results: [] }));
await widget('data-table', { columns: ['User', 'Species', 'Obs'], rows: (board?.results ?? []).map(r => [r.user?.login ?? '—', r.species_count ?? 0, r.observation_count ?? 0]) });
```

## Common mistakes

- **Mixing date fields** — for "this year" use `d1`/`d2` on `observed_on` (default), not `created_at`
- **Forgetting `quality_grade`** — recap accuracy depends on research-grade filtering
- **Using a calendar year that hasn't happened yet** — the chart will look like a cliff; cap `d2` at today
- **Single API call** — a recap needs multiple aggregations (counts + histogram + breakdown + leaderboard); don't try to derive everything from one query
- **Showing tiny gallery thumbs** — for a "best-of" use `large` (500px) photos
- **Ignoring `place.id` resolution** — recaps without a place are too broad to be interesting
