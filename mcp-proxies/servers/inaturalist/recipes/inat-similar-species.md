---
id: inat-similar-species
name: Compare look-alike species
description: Help distinguish look-alike species by listing the taxa most often confused with a target — gallery, comparison cards, criteria table.
when: the user asks how to distinguish two species, what species look like X, common misidentifications, or wants help with confusing taxa
servers: [inaturalist]
tools_used: [search_taxa, similar_species, get_taxon]
data_type: frequently confused taxa + photos + diagnostic fields
components_used: [gallery, cards, table, text]
layout:
  type: grid
  columns: 2
  arrangement: gallery on top, cards side-by-side, table below
---

## When to use

- "How do I tell a blue tit from a great tit?"
- "Which species look like the golden eagle?"
- "Common misidentifications for Cortinarius mushrooms"
- "What's confusable with the European hare?"
- "Help me distinguish similar warblers"

## How to use

```js
// 1. Resolve the target species
const taxa = await call('search_taxa', { q: 'Aquila chrysaetos', per_page: 1, locale: 'en' });
const target = taxa?.results?.[0];
if (!target) {
  await widget('text', { content: 'Species not found.' });
  return;
}
const targetDetail = await call('get_taxon', { id: target.id }).catch(() => null);

// 2. Get the look-alikes (ranked by misidentification frequency)
const sim = await call('similar_species', { taxon_id: target.id, per_page: 6 }).catch(() => ({ results: [] }));

// 3. Hydrate each look-alike
const lookAlikes = (await Promise.all(
  (sim?.results ?? []).filter(r => r.taxon?.id).map(r => call('get_taxon', { id: r.taxon.id }).catch(() => null)),
)).filter(Boolean);

const allTaxa = [targetDetail, ...lookAlikes].filter(Boolean);

// 4. Comparison gallery (target + 3-5 alternatives)
await widget('gallery', {
  images: allTaxa
    .filter(t => t.default_photo?.medium_url)
    .map(t => ({
      src: t.default_photo.medium_url,
      caption: `${t.preferred_common_name ?? t.name ?? '—'} — ${t.name ?? ''}`,
    })),
});

// 5. Cards per species
await widget('cards', {
  items: allTaxa.map(t => ({
    title: t.preferred_common_name ?? t.name ?? 'Unknown',
    subtitle: t.name ?? '',
    image: t.default_photo?.square_url,
    description: (t.wikipedia_summary ?? '').slice(0, 220),
  })),
});

// 6. Diagnostic table
await widget('data-table', {
  columns: ['Species', 'Family', 'Observations', 'Conservation'],
  rows: allTaxa.map(t => [
    t.preferred_common_name ?? t.name ?? '—',
    t.ancestors?.find(a => a.rank === 'family')?.name ?? '—',
    t.observations_count ?? 0,
    t.conservation_status?.status_name ?? 'LC',
  ]),
});
await widget('text', { content: `Look-alikes are ranked by how often iNaturalist identifiers confuse them with the target species. Use the gallery + Wikipedia summaries above to refine your ID.` });
```

## Examples

### Blue tit vs great tit
```js
const t = (await call('search_taxa', { q: 'Cyanistes caeruleus', per_page: 1 }))?.results?.[0];
if (!t) { await widget('text', { content: 'Species not found.' }); return; }
const sim = await call('similar_species', { taxon_id: t.id, per_page: 4 }).catch(() => ({ results: [] }));
await widget('cards', { items: (sim?.results ?? []).filter(r => r.taxon).map(r => ({ title: r.taxon?.preferred_common_name ?? r.taxon?.name ?? 'Unknown', subtitle: r.taxon?.name ?? '', image: r.taxon?.default_photo?.square_url })) });
```

### Look-alikes of the European hare
```js
const t = (await call('search_taxa', { q: 'Lepus europaeus', per_page: 1 }))?.results?.[0];
if (!t) { await widget('text', { content: 'Species not found.' }); return; }
const sim = await call('similar_species', { taxon_id: t.id }).catch(() => ({ results: [] }));
await widget('gallery', { images: (sim?.results ?? []).filter(r => r.taxon?.default_photo?.medium_url).map(r => ({ src: r.taxon.default_photo.medium_url, caption: r.taxon.preferred_common_name ?? r.taxon.name ?? '' })) });
```

## Common mistakes

- **Calling `similar_species` with a name** — it requires `taxon_id`, resolve via `search_taxa` first
- **Including the target taxon in `sim.results`** — it isn't there, you must add it manually for the comparison gallery
- **Skipping `get_taxon` hydration** — `similar_species` returns only the basic taxon stub, you need full details for Wikipedia / ancestors
- **Showing too many look-alikes** — beyond 5-6 the comparison loses meaning; clip to 4-5 strongest matches
- **Square thumbnails in the gallery** — the user needs to see the diagnostic features, use `medium_url`
- **Forgetting that look-alikes can be cross-genus** — don't filter by family or you'll miss real misidentifications
