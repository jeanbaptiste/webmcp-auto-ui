---
id: inat-protected-species
name: Protected / threatened species in a region
description: List vulnerable, endangered or protected species observed in a region — table with conservation status, observation map, photo gallery.
when: the user asks for endangered species, protected species, vulnerable wildlife, IUCN red list, or conservation-grade taxa observed somewhere
servers: [inaturalist]
tools_used: [search_observations, get_taxon, species_counts, search_places]
data_type: observations filtered by conservation status
components_used: [table, map, gallery, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: table top, map + gallery side-by-side, stats row
---

## When to use

- "Threatened species observed in the Pyrenees"
- "Vulnerable wildlife in Corsica"
- "Endangered plants of the Massif Central"
- "Red list species in the Alps"
- "Protected fauna observed in Brittany"

## How to use

```js
// 1. Resolve the region
const place = (await call('search_places', { q: 'Pyrenees', per_page: 1 }))?.results?.[0];
if (!place) {
  await widget('text', { content: 'Region not found.' });
  return;
}

// 2. Top threatened species observed there (server-side filter — includes default_photo)
const top = await call('species_counts', {
  place_id: place.id, per_page: 100, quality_grade: 'research', threatened: true,
}).catch(() => ({ results: [] }));

// 3. Hydrate species and keep only the protected ones
const detailed = await Promise.all(
  (top?.results ?? []).slice(0, 60).map(r => call('get_taxon', { id: r.taxon?.id }).catch(() => null)),
);
const protectedTaxa = detailed.filter(t => {
  const s = t?.conservation_status?.status?.toLowerCase();
  return s && !['lc', 'least_concern', 'nt'].includes(s);
});

// 4. Observations for the map
const ids = protectedTaxa.slice(0, 8).map(t => t.id).join(',');
const obs = ids
  ? await call('search_observations', {
      place_id: place.id, taxon_id: ids,
      per_page: 100, quality_grade: 'research',
    }).catch(() => ({ results: [], total_results: 0 }))
  : { results: [], total_results: 0 };

// 5. Render
if (protectedTaxa.length === 0) {
  await widget('text', { content: 'No protected species found in this region.' });
} else {
  await widget('data-table', {
    columns: ['Species', 'Common name', 'Status', 'Family'],
    rows: protectedTaxa.map(t => [
      t.name ?? '—',
      t.preferred_common_name ?? '—',
      t.conservation_status?.status_name ?? t.conservation_status?.status ?? '—',
      t.ancestors?.find(a => a.rank === 'family')?.name ?? '—',
    ]),
  });
}
await widget('map', {
  zoom: 7,
  cluster: true,
  markers: (obs?.results ?? [])
    .filter(o => o.geojson?.coordinates)
    .map(o => ({
      lat: o.geojson.coordinates[1],
      lon: o.geojson.coordinates[0],
      label: o.species_guess ?? o.taxon?.name ?? '',
      popup: o.observed_on ?? '',
    })),
});
await widget('gallery', {
  images: (top?.results ?? [])
    .filter(r => r?.taxon?.default_photo?.medium_url)
    .map(r => ({ src: r.taxon.default_photo.medium_url, caption: r.taxon.preferred_common_name ?? r.taxon.name ?? '' })),
});
await widget('stat-card', { label: 'Protected species found', value: protectedTaxa.length, icon: 'shield' });
await widget('stat-card', { label: 'Observations mapped', value: obs?.total_results ?? 0, icon: 'eye' });
await widget('stat-card', { label: 'Place', value: place.display_name ?? '—', icon: 'map' });
```

## Examples

### Endangered species in Corsica
```js
const place = (await call('search_places', { q: 'Corsica', per_page: 1 }))?.results?.[0];
if (!place) { await widget('text', { content: 'Place not found.' }); return; }
const top = await call('species_counts', { place_id: place.id, per_page: 50 }).catch(() => ({ results: [] }));
const det = await Promise.all((top?.results ?? []).slice(0, 30).map(r => call('get_taxon', { id: r.taxon?.id }).catch(() => null)));
const prot = det.filter(t => t?.conservation_status && t.conservation_status.status !== 'LC');
await widget('data-table', { columns: ['Species', 'Status'], rows: prot.map(t => [t.name ?? '—', t.conservation_status?.status_name ?? '—']) });
```

### Red list flora in the Alps
```js
const place = (await call('search_places', { q: 'Alps', per_page: 1 }))?.results?.[0];
if (!place) { await widget('text', { content: 'Place not found.' }); return; }
const top = await call('species_counts', { place_id: place.id, taxon_name: 'Plantae', per_page: 80 }).catch(() => ({ results: [] }));
const det = await Promise.all((top?.results ?? []).slice(0, 50).map(r => call('get_taxon', { id: r.taxon?.id }).catch(() => null)));
await widget('gallery', { images: det.filter(t => t?.conservation_status && (t?.default_photo?.medium_url || t?.preferred_photos?.[0]?.medium_url)).map(t => ({ src: t.default_photo?.medium_url ?? t.preferred_photos[0].medium_url, caption: `${t.name ?? '—'} — ${t.conservation_status?.status_name ?? '—'}` })) });
```

## Common mistakes

- **No filter on conservation status** — iNaturalist API doesn't expose a direct flag; you must hydrate `get_taxon` and filter client-side on `conservation_status`
- **Treating "no status" as "safe"** — many species lack an iNat-recorded status; consider them "data deficient" rather than "least concern"
- **Calling `get_taxon` 100 times** — cap the hydration to 30-60 species (the most common ones) to avoid rate limits
- **Sharing precise locations of endangered species** — for very rare species the API may obfuscate coordinates; respect that and don't try to circumvent it
- **Including coarsely-classified taxa** (rank: family, genus) — they don't carry meaningful conservation status; filter to `rank: "species"`
- **Mixing global vs local status** — IUCN status is global; a "vulnerable" species globally may be common locally and vice-versa
