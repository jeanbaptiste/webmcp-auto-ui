---
id: inat-biodiversity-hotspots
name: Biodiversity hotspots for a clade
description: Identify the best places to observe a given clade in a region — hotspot map, density table and representative gallery.
when: the user asks for the best spots to observe a taxon, biodiversity hotspots, prime locations, or where to go for X
servers: [inaturalist]
tools_used: [search_places, species_counts, search_observations]
data_type: species richness ranked by location
components_used: [map, table, stat-card, gallery]
layout:
  type: grid
  columns: 2
  arrangement: map top, table + gallery side-by-side, stats row at bottom
---

## When to use

- "Best spots for amphibians in Aquitaine?"
- "Top locations for raptors in the Massif Central"
- "Hotspots for orchids in southern France"
- "Where should I go to see wild boars in Italy?"
- "Best places for snorkeling fish biodiversity in the Med"

## How to use

```js
// 1. Resolve the parent region
const region = (await call('search_places', { q: 'Aquitaine', per_page: 1 }))?.results?.[0];
if (!region || !region.bounding_box_geojson?.coordinates?.[0]) {
  await widget('text', { content: 'Region not found.' });
  return;
}
const bbox = region.bounding_box_geojson.coordinates[0];

// 2. Find candidate sub-places inside the region
const candidates = await call('nearby_places', {
  nelat: bbox[2]?.[1],
  nelng: bbox[2]?.[0],
  swlat: bbox[0]?.[1],
  swlng: bbox[0]?.[0],
  per_page: 12,
}).catch(() => ({ results: [] }));

// 3. Score each candidate by species richness for the target clade
const ranked = await Promise.all(
  (candidates?.results ?? []).map(async p => {
    const counts = await call('species_counts', {
      place_id: p.id,
      taxon_name: 'Amphibia',
      per_page: 1,
    }).catch(() => ({ total_results: 0 }));
    return { place: p, richness: counts?.total_results ?? 0 };
  }),
);
ranked.sort((a, b) => b.richness - a.richness);
const top5 = ranked.slice(0, 5);

if (top5.length === 0) {
  await widget('text', { content: 'No hotspots found for this clade in the region.' });
  return;
}

// 4. Sample observations from the leader for the gallery
const lead = top5[0];
const obs = await call('search_observations', {
  place_id: lead.place.id,
  taxon_name: 'Amphibia',
  quality_grade: 'research',
  per_page: 30,
}).catch(() => ({ results: [] }));

// 5. Render
await widget('map', {
  zoom: 8,
  markers: top5
    .filter(r => r.place?.location)
    .map(r => {
      const [lat, lon] = r.place.location.split(',');
      return {
        lat,
        lon,
        label: r.place.display_name ?? '',
        popup: `${r.richness} species`,
      };
    }),
});
await widget('table', {
  columns: ['Rank', 'Place', 'Species'],
  rows: top5.map((r, i) => [i + 1, r.place.display_name ?? '—', r.richness ?? 0]),
});
await widget('stat-card', { label: 'Best hotspot', value: lead.place.display_name ?? '—', icon: 'star' });
await widget('stat-card', { label: 'Species there', value: lead.richness ?? 0, icon: 'leaf' });
await widget('gallery', {
  images: (obs?.results ?? [])
    .filter(o => o.photos?.length > 0 && o.photos[0]?.url)
    .slice(0, 12)
    .map(o => ({
      src: o.photos[0].url.replace('square', 'medium'),
      caption: o.species_guess ?? o.taxon?.name ?? '',
    })),
});
```

## Examples

### Raptor hotspots in the Massif Central
```js
const region = (await call('search_places', { q: 'Massif Central', per_page: 1 }))?.results?.[0];
if (!region) { await widget('text', { content: 'Region not found.' }); return; }
const candidates = await call('nearby_places', { nelat: region.bounding_box_geojson?.coordinates?.[0]?.[2]?.[1], nelng: region.bounding_box_geojson?.coordinates?.[0]?.[2]?.[0], swlat: region.bounding_box_geojson?.coordinates?.[0]?.[0]?.[1], swlng: region.bounding_box_geojson?.coordinates?.[0]?.[0]?.[0], per_page: 10 }).catch(() => ({ results: [] }));
const ranked = await Promise.all((candidates?.results ?? []).map(async p => { const counts = await call('species_counts', { place_id: p.id, taxon_name: 'Accipitriformes', per_page: 1 }).catch(() => ({ total_results: 0 })); return { place: p, richness: counts?.total_results ?? 0 }; }));
ranked.sort((a, b) => b.richness - a.richness);
await widget('table', { columns: ['Place', 'Species'], rows: ranked.slice(0, 8).map((r, i) => [r.place?.display_name ?? '—', r.richness ?? 0]) });
```

### Orchid spots in Provence
```js
const region = (await call('search_places', { q: 'Provence', per_page: 1 }))?.results?.[0];
if (!region) { await widget('text', { content: 'Region not found.' }); return; }
const counts = await call('species_counts', { place_id: region.id, taxon_name: 'Orchidaceae', per_page: 10 }).catch(() => ({ results: [] }));
await widget('table', { columns: ['Species', 'Observations'], rows: (counts?.results ?? []).map(r => [r.taxon?.name ?? '—', r.count ?? 0]) });
```

## Common mistakes

- **Single API call for the whole region** — that gives you species totals, not hotspots; you need to break the region into sub-places
- **Using `nearby_places` without a bounding box** from a parent place — the API requires `nelat/nelng/swlat/swlng`
- **Trusting the `nearby_places` order** — they aren't ranked by biodiversity, you must re-score with `species_counts`
- **Too many parallel `species_counts` calls** — cap candidates at ~12 to keep latency reasonable
- **Map markers without lat/lon parsing** — `place.location` is a `"lat,lng"` string, split it
- **Forgetting the clade filter** — a hotspot for "all life" is meaningless; always require `taxon_name` from the user
