---
id: inat-park-breakdown
name: Biodiversity breakdown of a park
description: Summarise a park's biodiversity by iconic taxon group with a pie chart, key stats, top species table and representative gallery.
when: the user asks what's in a park, the composition of a reserve's flora and fauna, biodiversity breakdown, or a high-level audit of a place
servers: [inaturalist]
tools_used: [search_places, iconic_taxa_counts, species_counts, search_observations]
data_type: species counts by iconic taxon group
components_used: [chart-rich, stat-card, table, gallery]
layout:
  type: grid
  columns: 2
  arrangement: pie chart + stats side-by-side, table full-width, gallery below
---

## When to use

- "What is the biodiversity composition of Cévennes National Park?"
- "Breakdown of the Écrins park flora and fauna"
- "What kingdoms dominate Brocéliande forest?"
- "How does the Camargue split between birds, fish and plants?"
- "Park biodiversity overview for Vanoise"

## How to use

```js
// 1. Resolve the park
const place = (await call('search_places', { q: 'Cévennes National Park', per_page: 1 }))?.results?.[0];
if (!place) {
  await widget('text', { content: 'Park not found.' });
  return;
}

// 2. Iconic taxa breakdown (Animalia, Plantae, Fungi, Aves, etc.)
const [breakdown, top, obs] = await Promise.all([
  call('iconic_taxa_counts', { place_id: place.id, quality_grade: 'research' }).catch(() => ({ results: [] })),
  call('species_counts', { place_id: place.id, per_page: 12, quality_grade: 'research' }).catch(() => ({ results: [] })),
  call('search_observations', { place_id: place.id, quality_grade: 'research', per_page: 24 }).catch(() => ({ results: [] })),
]);

const breakdownResults = (breakdown?.results ?? []).filter(r => r.taxon);

// 5. Pie chart of iconic groups
await widget('chart-rich', {
  type: 'pie',
  title: `${place.display_name ?? 'Park'} — biodiversity by group`,
  labels: breakdownResults.map(r => r.taxon?.preferred_common_name ?? r.taxon?.name ?? 'Unknown'),
  data: breakdownResults.map(r => r.count ?? 0),
  caption: 'Counts are unique species at research grade.',
});

// 6. Headline stats
const total = breakdownResults.reduce((s, r) => s + (r.count ?? 0), 0);
const dominant = [...breakdownResults].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))[0];
await widget('stat-card', { label: 'Place', value: place.display_name ?? '—', icon: 'map' });
await widget('stat-card', { label: 'Total species', value: total, icon: 'leaf' });
await widget('stat-card', { label: 'Dominant group', value: dominant?.taxon?.preferred_common_name ?? dominant?.taxon?.name ?? '—', icon: 'star' });

// 7. Top species table
await widget('data-table', {
  columns: ['Species', 'Common name', 'Observations'],
  rows: (top?.results ?? []).map(r => [r.taxon?.name ?? '—', r.taxon?.preferred_common_name ?? '—', r.count ?? 0]),
});

// 8. Photo gallery
await widget('gallery', {
  images: (obs?.results ?? [])
    .filter(o => o.photos?.length > 0 && o.photos[0]?.url)
    .map(o => ({
      src: o.photos[0].url.replace('square', 'medium'),
      caption: o.species_guess ?? o.taxon?.name ?? '',
    })),
});
```

## Examples

### Écrins park breakdown
```js
const place = (await call('search_places', { q: 'Écrins National Park', per_page: 1 }))?.results?.[0];
if (!place) { await widget('text', { content: 'Park not found.' }); return; }
const b = await call('iconic_taxa_counts', { place_id: place.id }).catch(() => ({ results: [] }));
await widget('chart-rich', { type: 'pie', labels: (b?.results ?? []).map(r => r.taxon?.name ?? 'Unknown'), data: (b?.results ?? []).map(r => r.count ?? 0) });
```

### Camargue split
```js
const place = (await call('search_places', { q: 'Camargue', per_page: 1 }))?.results?.[0];
if (!place) { await widget('text', { content: 'Place not found.' }); return; }
const b = await call('iconic_taxa_counts', { place_id: place.id, quality_grade: 'research' }).catch(() => ({ results: [] }));
await widget('data-table', { columns: ['Group', 'Species'], rows: (b?.results ?? []).map(r => [r.taxon?.preferred_common_name ?? r.taxon?.name ?? 'Unknown', r.count ?? 0]) });
```

## Common mistakes

- **Skipping `quality_grade: "research"`** — casual obs inflate "Insecta" disproportionately and skew the pie chart
- **Showing every iconic group** — there are 13+ groups; clip to top 7-8 for readable pie slices
- **Using a bar chart instead of a pie** — proportions of a whole are clearer in a pie/donut for laypeople
- **Place not found** — names like "Cevennes" may not match exactly; use the user's term then validate `place.display_name`
- **Sorting `breakdown.results` once** without keeping the order — sort before chart but keep the same order for legend & stat-cards
- **Forgetting that `iconic_taxa_counts.results` items have a `taxon` wrapper** — use `r.taxon.name`, not `r.name`
