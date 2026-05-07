---
id: inat-id-quiz
name: AI-assisted identification suggestions
description: Reproduce the iNaturalist Computer Vision identification UX — given a place and date, suggest the most likely taxa with photos and a location map.
when: the user asks "what could I see here today", "help me identify this photo at <place>", or wants AI-assisted ID suggestions for a location
servers: [inaturalist]
tools_used: [taxon_suggestions, get_taxon]
data_type: contextual ID suggestions
components_used: [cards, gallery, kv, map]
layout:
  type: grid
  columns: 2
  arrangement: map top-left, kv top-right, cards row, gallery below
---

## When to use

- "What can I observe at lat 45.92, lng 6.86 on 15 May?"
- "Help me identify this photo taken at Lake Annecy yesterday"
- "Suggest birds for the South of France in spring"
- "What's likely to be active in the Vosges right now?"
- "ID hints for a butterfly photo from Provence in July"

## How to use

```js
// 1. Inputs (extract from the user's question or geolocation)
const lat = 45.92;
const lng = 6.86;
const observed_on = '2025-05-15';

// 2. Get suggestions (default source is *observations — recent IDs in the area)
const sugg = await call('taxon_suggestions', {
  lat, lng, observed_on,
  source: '*observations',
  limit: 8,
}).catch(() => ({ results: [], source: '—' }));

const suggResults = (sugg?.results ?? []).filter(s => s.taxon?.id);
if (suggResults.length === 0) {
  await widget('text', { content: 'No suggestions for this location/date.' });
  return;
}

// 3. Hydrate top suggestions with full taxon details
const detailed = await Promise.all(
  suggResults.slice(0, 6).map(s => call('get_taxon', { id: s.taxon.id }).catch(() => null)),
);

// 4. Render context map
await widget('map', {
  center: [lng, lat],
  zoom: 10,
  markers: [{ lat, lon: lng, label: 'Your location', popup: observed_on }],
}).catch(() => null);

// 5. Context kv
await widget('kv', {
  title: 'Suggestion context',
  rows: [
    ['Coordinates', `${lat}, ${lng}`],
    ['Date', observed_on],
    ['Suggestion source', sugg?.source ?? '—'],
    ['Candidates returned', String(suggResults.length)],
  ],
}).catch(() => null);

// 6. Suggestion cards (with iNat probability/frequency)
await widget('cards', {
  items: detailed.map((t, i) => ({
    title: t?.preferred_common_name ?? t?.name ?? suggResults[i]?.taxon?.name ?? 'Unknown',
    subtitle: t?.name ?? '',
    image: t?.default_photo?.medium_url,
    description: `Frequency score: ${suggResults[i]?.frequency_score?.toFixed(2) ?? '—'}`,
  })),
});

// 7. Comparison gallery so the user can match their photo
await widget('gallery', {
  images: detailed
    .filter(t => t?.default_photo?.medium_url)
    .map(t => ({ src: t.default_photo.medium_url, caption: t.preferred_common_name ?? t.name ?? '' })),
});
```

## Examples

### Birds suggestions in Annecy in May
```js
const sugg = await call('taxon_suggestions', { lat: 45.92, lng: 6.86, observed_on: '2025-05-15', taxon_id: 3, limit: 6 }).catch(() => ({ results: [] }));
await widget('cards', { items: (sugg?.results ?? []).filter(s => s.taxon).map(s => ({ title: s.taxon?.preferred_common_name ?? s.taxon?.name ?? 'Unknown', subtitle: s.taxon?.name ?? '', image: s.taxon?.default_photo?.medium_url })) });
```

### Constrain to a clade (butterflies)
```js
const sugg = await call('taxon_suggestions', { lat: 43.6, lng: 3.9, observed_on: '2025-07-10', taxon_id: 47157, limit: 5 }).catch(() => ({ results: [] }));
await widget('gallery', { images: (sugg?.results ?? []).filter(s => s.taxon?.default_photo?.medium_url).map(s => ({ src: s.taxon.default_photo.medium_url, caption: s.taxon.preferred_common_name ?? s.taxon.name ?? '' })) });
```

## Common mistakes

- **Forgetting `observed_on`** — the date is critical, suggestions for January vs July differ wildly even at the same location
- **Wrong date format** — must be `YYYY-MM-DD`, the API silently accepts only this
- **Using `source: "checklist"`** for a remote area — checklists are sparse, fall back to `*observations` for actual sightings
- **Treating suggestions as identifications** — they are likelihood ranks, not authoritative IDs; always frame as "candidates"
- **Skipping `get_taxon` hydration** — the `s.taxon` stub lacks Wikipedia, conservation status and high-res photos
- **Constraining `taxon_id` too tightly** (e.g. genus-level) — the suggestion engine works best with class-level clades (Aves, Insecta, Mammalia)
