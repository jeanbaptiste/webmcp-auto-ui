---
id: inat-unobserved-species
name: Species not yet observed in a place
description: Surface checklist species that are expected at a place but have no recorded observations there yet — perfect for prospection targets.
when: the user asks which species haven't been observed at a place, biodiversity gaps, undiscovered species, prospection targets, or to-find checklist
servers: [inaturalist]
tools_used: [search_places, unobserved_taxa, get_taxon]
data_type: checklist gap (expected − observed)
components_used: [cards, table, gallery, text]
layout:
  type: grid
  columns: 2
  arrangement: text full-width, cards row, table + gallery below
---

## When to use

- "What bird species have never been seen in Brocéliande?"
- "Mammals not yet observed at the Vanoise national park"
- "Undiscovered orchids in the Pyrenees"
- "Prospection targets for amphibians around Lake Geneva"
- "Help me find rare butterflies in the Cévennes"

## How to use

```js
// 1. Resolve the place
const places = await call('search_places', { q: 'Vanoise', per_page: 1 });
const place = places?.results?.[0];
if (!place) {
  await widget('text', { content: 'Place not found.' });
  return;
}

// 2. Pick the clade root (3 = birds, 47126 = plants, 40151 = mammals, 47158 = insects, 1 = all life)
const cladeId = 40151; // mammals

// 3. Unobserved species in this clade for this place
const gap = await call('unobserved_taxa', {
  taxon_id: cladeId,
  place_id: place.id,
  per_page: 8,
}).catch(() => ({ results: [] }));

const gapResults = gap?.results ?? [];

// 4. Hydrate each missing species with photos
await widget('text', { content: 'Hydrating species data…' });
const detailed = (await Promise.all(
  gapResults.slice(0, 8).map(t => call('get_taxon', { id: t.id }).catch(() => null)),
)).filter(Boolean);

// 5. Render
await widget('text', {
  content: `These species are listed for ${place.display_name ?? 'this place'} but have no iNaturalist observation there yet — they make great prospection targets.`,
});
if (detailed.length === 0) {
  await widget('text', { content: 'No unobserved species found.' });
  return;
}
await widget('cards', {
  items: detailed.slice(0, 6).map(t => ({
    title: t.preferred_common_name ?? t.name ?? 'Unknown',
    subtitle: t.name ?? '',
    image: t.default_photo?.medium_url,
    description: (t.wikipedia_summary ?? '').slice(0, 200),
  })),
});
await widget('data-table', {
  columns: ['Species', 'Family', 'Conservation', 'Global obs.'],
  rows: detailed.map(t => [
    t.preferred_common_name ?? t.name ?? '—',
    t.ancestors?.find(a => a.rank === 'family')?.name ?? '—',
    t.conservation_status?.status_name ?? 'LC',
    t.observations_count ?? 0,
  ]),
});
await widget('gallery', {
  images: detailed
    .filter(t => t.default_photo?.medium_url)
    .map(t => ({
      src: t.default_photo.medium_url,
      caption: t.preferred_common_name ?? t.name ?? '',
    })),
});
```

## Examples

### Birds never observed in Brocéliande
```js
const place = (await call('search_places', { q: 'Brocéliande', per_page: 1 }))?.results?.[0];
if (!place) { await widget('text', { content: 'Place not found.' }); return; }
const gap = await call('unobserved_taxa', { taxon_id: 3, place_id: place.id, per_page: 12 }).catch(() => ({ results: [] }));
await widget('cards', { items: (gap?.results ?? []).map(t => ({ title: t.preferred_common_name ?? t.name ?? '—', subtitle: t.name ?? '', image: t.default_photo?.medium_url })) });
```

### Missing orchids in Pyrenees
```js
const place = (await call('search_places', { q: 'Pyrenees', per_page: 1 }))?.results?.[0];
const orchid = (await call('search_taxa', { q: 'Orchidaceae', rank: 'family', per_page: 1 }))?.results?.[0];
if (!place || !orchid) { await widget('text', { content: 'Place or clade not found.' }); return; }
const gap = await call('unobserved_taxa', { taxon_id: orchid.id, place_id: place.id, per_page: 10 }).catch(() => ({ results: [] }));
await widget('data-table', { columns: ['Species', 'Common name'], rows: (gap?.results ?? []).map(t => [t.name ?? '—', t.preferred_common_name ?? '—']) });
```

## Common mistakes

- **Using `taxon_id: 1` (all life)** — the result is gigantic and useless; always pick a meaningful clade
- **Skipping `search_places`** — `unobserved_taxa` requires an integer `place_id`, names won't work
- **Forgetting that "unobserved" means "not on iNat"** — the species may exist in scientific literature but nobody photographed it on iNaturalist yet
- **Not showing photos** — without `default_photo` the user can't recognize what to look for; always hydrate via `get_taxon`
- **Promising the user "they will find these"** — many are very rare or hard to detect; frame as "prospection targets", not guarantees
- **Fetching too many `get_taxon` calls** — each is an HTTP round-trip; cap at 10-15 species, never the full result set
