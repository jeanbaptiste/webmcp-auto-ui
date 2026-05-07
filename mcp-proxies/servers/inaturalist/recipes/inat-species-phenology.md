---
id: inat-species-phenology
name: Seasonal phenology of a species
description: Show when a species is most active during the year via a monthly histogram, key stats, illustrative photos and a condensed taxon card.
when: the user asks when a species can be observed, its seasonal peak, its phenology, or the best month to spot it
servers: [inaturalist]
tools_used: [observations_histogram, search_observations, get_taxon, search_taxa, search_places]
data_type: monthly time series + photos + taxon info
components_used: [chart, stat-card, gallery, kv]
layout:
  type: grid
  columns: 2
  arrangement: chart full-width, stats + kv side-by-side, gallery at bottom
---

## When to use

- "When can I see swallows in France?"
- "What's the peak activity month for cicadas?"
- "When are kingfishers most observed in Ile-de-France?"
- "Best season to spot dragonflies in Provence?"
- "Phenology of the European hoopoe"

## How to use

```js
// 1. Resolve the taxon
const taxa = await call('search_taxa', { q: 'Alcedo atthis', per_page: 1, locale: 'en' });
const taxon = taxa?.results?.[0];
if (!taxon) {
  await widget('text', { content: 'Species not found.' });
  return;
}

// 2. Monthly histogram, taxon detail, sample photos in parallel
const [hist, detail, obs] = await Promise.all([
  call('observations_histogram', { taxon_id: taxon.id, interval: 'month', quality_grade: 'research' }).catch(() => ({ results: { month: {} } })),
  call('get_taxon', { id: taxon.id, locale: 'en' }).catch(() => null),
  call('search_observations', { taxon_id: taxon.id, quality_grade: 'research', per_page: 24 }).catch(() => ({ results: [] })),
]);

// 3. Identify peak
const months = Object.entries(hist?.results?.month ?? {});
const sortedMonths = [...months].sort((a, b) => b[1] - a[1]);
const peak = sortedMonths[0];
const total = months.reduce((s, [, n]) => s + (n ?? 0), 0);

// 4. Render
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
await widget('chart', {
  title: `Monthly observations of ${taxon.preferred_common_name ?? taxon.name ?? 'species'}`,
  bars: months.map(([m, n]) => [MONTH_NAMES[Number(m) - 1] ?? m, Number(n)]),
});
await widget('stat-card', { label: 'Peak month', value: MONTH_NAMES[Number(peak?.[0]) - 1] ?? peak?.[0] ?? '—', icon: 'calendar' });
await widget('stat-card', { label: 'Total observations', value: total, icon: 'eye' });
await widget('kv', {
  title: taxon.preferred_common_name ?? taxon.name ?? 'Species',
  rows: [
    ['Scientific name', String(taxon.name ?? '—')],
    ['Rank', String(taxon.rank ?? '—')],
    ['Conservation', String(detail?.conservation_status?.status_name ?? 'Least concern')],
  ],
});
await widget('gallery', {
  images: (obs?.results ?? [])
    .filter(o => o.photos?.length > 0 && o.photos[0]?.url)
    .map(o => ({
      src: o.photos[0].url.replace('square', 'medium'),
      caption: `${o.place_guess ?? ''} — ${o.observed_on ?? '—'}`,
    })),
});
```

## Examples

### Kingfisher in Ile-de-France
```js
const place = (await call('search_places', { q: 'Ile-de-France', per_page: 1 }))?.results?.[0];
const taxa = await call('search_taxa', { q: 'martin-pêcheur', locale: 'fr', per_page: 1 });
const t = taxa?.results?.[0];
if (!place || !t) { await widget('text', { content: 'Place or species not found.' }); return; }
const hist = await call('observations_histogram', { taxon_id: t.id, place_id: place.id, interval: 'month' }).catch(() => ({ results: { month: {} } }));
const m = hist?.results?.month ?? {};
await widget('chart', { bars: Object.entries(m).map(([k, v]) => [k, Number(v)]) });
```

### Cicada peak
```js
const t = (await call('search_taxa', { q: 'Cicadidae', rank: 'family', per_page: 1 }))?.results?.[0];
if (!t) { await widget('text', { content: 'Clade not found.' }); return; }
const hist = await call('observations_histogram', { taxon_id: t.id, interval: 'month' }).catch(() => ({ results: { month: {} } }));
const m = hist?.results?.month ?? {};
await widget('chart', { title: 'Cicadas — global phenology', bars: Object.entries(m).map(([k, v]) => [k, Number(v)]) });
```

## Common mistakes

- **Confusing `month` interval (across all years) with `week` (year-by-year)** — for "when is the peak" use `interval: "month"`
- **Forgetting `quality_grade: "research"`** introduces noise from casual / dubious observations
- **Not bounding by place** — global phenology can hide local variations (a swallow in Provence vs. Brittany)
- **Reading `hist.results.month` as an array** — it is an object keyed by month number ("1".."12"), use `Object.entries`
- **Missing histogram label translation** — month numbers are 1-based strings, map them to month names for clarity
- **Skipping `search_taxa` first** — taxon names are ambiguous (`Apis` vs `Apis mellifera`); always resolve to a taxon_id
