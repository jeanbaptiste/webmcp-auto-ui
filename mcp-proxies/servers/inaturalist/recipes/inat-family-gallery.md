---
id: inat-family-gallery
name: Themed gallery of a family or clade
description: Curate a research-grade photo gallery for a family / clade with descriptive cards and a clade summary — magazine-style iconography.
when: the user asks for a photo gallery of a family, "beautiful pictures of X", iconographic survey of a clade, or a magazine-style species spread
servers: [inaturalist]
tools_used: [search_taxa, search_observations_gallery, get_taxon, search_places]
data_type: research-grade photos of a clade
components_used: [gallery, cards, kv]
layout:
  type: grid
  columns: 2
  arrangement: gallery full-width, cards row, kv at bottom
---

## When to use

- "Beautiful photos of skipper butterflies"
- "Gallery of European wild orchids"
- "Magazine-style photo spread of woodpeckers"
- "Iconography of marine nudibranchs"
- "Stunning shots of Mediterranean sea fans"

## How to use

```js
// 1. Resolve the clade
const taxa = await call('search_taxa', { q: 'Hesperiidae', rank: 'family', per_page: 1 });
const clade = taxa?.results?.[0];
if (!clade) {
  await widget('text', { content: 'Clade not found.' });
  return;
}
const detail = await call('get_taxon', { id: clade.id }).catch(() => null);

// 2. Pull research-grade observations with photos (compact projection)
const obs = await call('search_observations_gallery', {
  taxon_id: clade.id,
  quality_grade: 'research',
  per_page: 80,
}).catch(() => ({ results: [] }));

// 3. Group photos by species and pick the best per species
const bySpecies = new Map();
for (const o of (obs?.results ?? [])) {
  if (!o.photo_url) continue;
  const k = o.taxon_id;
  if (!k || bySpecies.has(k)) continue;
  bySpecies.set(k, o);
}
const species = [...bySpecies.values()].slice(0, 24);

if (species.length === 0) {
  await widget('text', { content: 'No research-grade photos found for this clade.' });
  return;
}

// 4. Render the curated gallery
await widget('gallery', {
  images: species.map(o => ({
    src: o.photo_url.replace('square', 'large'),
    caption: `${o.common_name ?? o.scientific_name ?? 'Unknown'} — ${o.place_guess ?? ''}`,
  })),
});

// 5. Descriptive cards for the top 6 species
await widget('cards', {
  items: species.slice(0, 6).map(o => ({
    title: o.common_name ?? o.scientific_name ?? 'Unknown',
    subtitle: o.scientific_name ?? '',
    image: o.photo_url.replace('square', 'medium'),
    description: `Observed in ${o.place_guess ?? '—'} on ${o.observed_on ?? '—'}`,
  })),
});

// 6. Clade summary
await widget('kv', {
  title: detail?.preferred_common_name ?? detail?.name ?? clade.name ?? 'Clade',
  rows: [
    ['Scientific name', detail?.name ?? clade.name ?? '—'],
    ['Rank', detail?.rank ?? clade.rank ?? '—'],
    ['Total iNat observations', String(detail?.observations_count ?? 0)],
    ['Species displayed', String(species.length)],
  ],
});
```

## Examples

### European wild orchids
```js
const t = (await call('search_taxa', { q: 'Orchidaceae', rank: 'family', per_page: 1 }))?.results?.[0];
const place = (await call('search_places', { q: 'Europe', per_page: 1 }))?.results?.[0];
if (!t || !place) { await widget('text', { content: 'Clade or place not found.' }); return; }
const obs = await call('search_observations_gallery', { taxon_id: t.id, place_id: place.id, per_page: 80, quality_grade: 'research' }).catch(() => ({ results: [] }));
await widget('gallery', { images: (obs?.results ?? []).filter(o => o.photo_url).slice(0, 24).map(o => ({ src: o.photo_url.replace('square', 'large'), caption: o.common_name ?? o.scientific_name ?? '' })) });
```

### Marine nudibranchs
```js
const t = (await call('search_taxa', { q: 'Nudibranchia', rank: 'order', per_page: 1 }))?.results?.[0];
if (!t) { await widget('text', { content: 'Clade not found.' }); return; }
const obs = await call('search_observations_gallery', { taxon_id: t.id, per_page: 60, quality_grade: 'research' }).catch(() => ({ results: [] }));
const bySpecies = new Map();
for (const o of (obs?.results ?? [])) { if (o.photo_url && o.taxon_id && !bySpecies.has(o.taxon_id)) bySpecies.set(o.taxon_id, o); }
await widget('gallery', { images: [...bySpecies.values()].map(o => ({ src: o.photo_url.replace('square', 'large'), caption: o.common_name ?? o.scientific_name ?? '' })) });
```

## Common mistakes

- **Skipping species deduplication** — without grouping you'll get 10 photos of the same common species; use a `Map` keyed on `taxon.id`
- **`square` thumbnails for a magazine spread** — always promote to `large` (500px) for gallery aesthetics
- **No `quality_grade`** — casual obs include unverified IDs and grainy shots; research-grade is the magazine filter
- **Forgetting `rank`** in `search_taxa` — "Orchids" matches a genus; require `rank: "family"` (or order/class) for clade-level galleries
- **Pulling 200 obs and rendering all** — the gallery becomes overwhelming; cap at 24-30 species
- **Showing the same photo as gallery + card** — use the medium URL for cards and the large URL for the gallery to differentiate sizes
