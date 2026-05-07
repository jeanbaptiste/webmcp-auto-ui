---
id: inat-species-profile
name: Full species profile sheet
description: Build a complete species sheet — taxonomy, conservation status, Wikipedia summary, photo gallery, world distribution and observation stats.
when: the user asks for a fact sheet about a species, "tell me about X", or wants to learn everything about a given taxon
servers: [inaturalist]
tools_used: [search_taxa, get_taxon, search_observations, species_counts]
data_type: taxonomic info + Wikipedia + photos + distribution map
components_used: [profile, gallery, map, stat-card, text]
layout:
  type: grid
  columns: 2
  arrangement: profile + stats top, map and gallery side-by-side, Wikipedia text full-width
---

## When to use

- "Tell me about the fire salamander"
- "Everything about the Eurasian lynx"
- "Give me a sheet on the great crested newt"
- "Profile of the Iberian wolf"
- "Who is the red panda?"

## How to use

```js
// 1. Resolve the species
const taxa = await call('search_taxa', { q: 'Salamandra salamandra', per_page: 1, locale: 'en' });
const t = taxa?.results?.[0];
if (!t) {
  await widget('text', { content: 'Species not found.' });
  return;
}

// 2. Detailed taxon info (Wikipedia, conservation, ancestors)
const detail = await call('get_taxon', { id: t.id, locale: 'en' });
if (!detail) {
  await widget('text', { content: 'Could not load taxon details.' });
  return;
}

// 3. Distribution: spread observations worldwide
const obs = await call('search_observations', {
  taxon_id: t.id, quality_grade: 'research', per_page: 200,
}).catch(() => ({ results: [], total_results: 0 }));

// 4. Aggregate counts (population strongholds)
const top = await call('species_counts', { taxon_id: t.id, per_page: 5 }).catch(() => ({ results: [] }));

// 5. Render
await widget('profile', {
  name: detail.preferred_common_name ?? detail.name ?? 'Unknown species',
  subtitle: detail.name ?? '',
  fields: [
    { label: 'Rank', value: detail.rank ?? '—' },
    { label: 'Family', value: detail.ancestors?.find(a => a.rank === 'family')?.name ?? '—' },
    { label: 'Conservation status', value: detail.conservation_status?.status_name ?? 'Least concern' },
    { label: 'Total observations', value: detail.observations_count ?? 0 },
  ],
});
await widget('text', { content: detail.wikipedia_summary || 'No Wikipedia summary available.' });
const mapMarkers = (obs?.results ?? [])
  .filter(o => o.geojson?.coordinates)
  .map(o => ({
    lat: o.geojson.coordinates[1],
    lon: o.geojson.coordinates[0],
    label: o.place_guess ?? '',
  }));
await widget('map', {
  zoom: 2,
  markers: mapMarkers,
  cluster: true,
});
await widget('gallery', {
  images: (obs?.results ?? [])
    .filter(o => o.photos?.length > 0 && o.photos[0]?.url)
    .slice(0, 24)
    .map(o => ({
      src: o.photos[0].url.replace('square', 'large'),
      caption: o.place_guess ?? '',
    })),
});
await widget('stat-card', { label: 'iNat observations', value: detail.observations_count ?? 0, icon: 'eye' });
```

## Examples

### Fire salamander
```js
const t = (await call('search_taxa', { q: 'fire salamander', per_page: 1 }))?.results?.[0];
if (!t) { await widget('text', { content: 'Species not found.' }); return; }
const d = await call('get_taxon', { id: t.id });
await widget('profile', { name: d?.preferred_common_name ?? d?.name ?? 'Unknown', subtitle: d?.name ?? '', fields: [{ label: 'Rank', value: d?.rank ?? '—' }, { label: 'Conservation', value: d?.conservation_status?.status_name ?? 'Least concern' }] });
```

### Red panda
```js
const t = (await call('search_taxa', { q: 'red panda', per_page: 1 }))?.results?.[0];
if (!t) { await widget('text', { content: 'Species not found.' }); return; }
const d = await call('get_taxon', { id: t.id });
const obs = await call('search_observations', { taxon_id: t.id, per_page: 100, quality_grade: 'research' }).catch(() => ({ results: [] }));
await widget('text', { content: d?.wikipedia_summary || 'No Wikipedia summary available.' });
await widget('map', { zoom: 3, markers: (obs?.results ?? []).filter(o => o.geojson?.coordinates).map(o => ({ lat: o.geojson.coordinates[1], lon: o.geojson.coordinates[0] })), cluster: true });
```

## Common mistakes

- **Calling `get_taxon` without an ID** — always resolve via `search_taxa` first; common names map to multiple taxa
- **Showing only the default photo** — gather 12-24 photos via `search_observations` for a richer gallery
- **Forgetting `wikipedia_summary` may be empty** for obscure taxa — handle the fallback gracefully
- **Map without clustering** when plotting world distribution with hundreds of points
- **Missing the `medium_url` / `large_url` fields** on `default_photo` — `square` is too small for a profile header
- **Not surfacing `conservation_status`** — for vulnerable / endangered species this is the most important fact
