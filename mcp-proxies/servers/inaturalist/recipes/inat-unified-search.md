---
id: inat-unified-search
name: Unified cross-entity search
description: Polyvalent entry point — searches taxa, places, projects and users at once, hydrates the dominant taxon and shows a sample gallery.
when: the user's intent is fuzzy, asks "search X on iNaturalist", or wants everything related to a free-form keyword
servers: [inaturalist]
tools_used: [search, get_taxon, search_observations]
data_type: cross-entity result mix
components_used: [cards, gallery, kv]
layout:
  type: grid
  columns: 2
  arrangement: cards full-width, kv top-left, gallery right + bottom
---

## When to use

- "Search 'otter' on iNaturalist"
- "Look up 'cévennes' across iNat"
- "Find anything related to 'bombyx'"
- "Show me all results for 'lichen'"
- "iNaturalist keyword search: 'eagle'"

## How to use

```js
// 1. Cross-entity search
const res = await call('search', {
  q: 'otter',
  sources: 'taxa,places,projects,users',
  per_page: 12,
}).catch(() => ({ results: [] }));

// Normalise by type: iNat returns type-specific fields, not a unified `record` envelope
const normalise = r => r.taxon ?? r.place ?? r.project ?? r.user ?? r.record ?? null;
const allResults = (res?.results ?? []).map(r => ({ ...r, _rec: normalise(r) })).filter(r => r._rec !== null);

// 2. Group results by source
const groups = { taxa: [], places: [], projects: [], users: [] };
for (const r of allResults) {
  if (groups[r.type]) groups[r.type].push(r);
}

if (allResults.length === 0) {
  await widget('text', { content: 'No results.' });
  return;
}

// 3. Render entity cards
await widget('cards', {
  items: allResults.slice(0, 8).map(r => ({
    title: r._rec?.preferred_common_name ?? r._rec?.title ?? r._rec?.display_name ?? r._rec?.login ?? 'Unknown',
    subtitle: `${r.type ?? ''} · ${r._rec?.name ?? r._rec?.slug ?? ''}`,
    image: r._rec?.default_photo?.medium_url ?? r._rec?.icon ?? r._rec?.icon_url,
    description: (r._rec?.wikipedia_summary ?? r._rec?.description ?? '').slice(0, 200),
  })),
});

// 4. Hydrate the dominant taxon if any
const topTaxon = groups.taxa[0];
if (topTaxon?._rec?.id) {
  const detail = await call('get_taxon', { id: topTaxon._rec.id }).catch(() => null);
  if (detail) {
    await widget('kv', {
      title: detail.preferred_common_name ?? detail.name ?? 'Taxon',
      items: {
        'Scientific name': detail.name ?? '—',
        Rank: detail.rank ?? '—',
        Family: detail.ancestors?.find(a => a.rank === 'family')?.name ?? '—',
        'Conservation': detail.conservation_status?.status_name ?? 'LC',
        'iNat observations': detail.observations_count ?? 0,
      },
    });

    // 5. Sample observations gallery
    const obs = await call('search_observations', {
      taxon_id: detail.id, per_page: 12, quality_grade: 'research',
    }).catch(() => ({ results: [] }));
    await widget('gallery', {
      images: (obs?.results ?? [])
        .filter(o => o.photos?.length > 0 && o.photos[0]?.url)
        .map(o => ({
          src: o.photos[0].url.replace('square', 'medium'),
          caption: o.place_guess ?? '',
        })),
    });
  }
}
```

## Examples

### Cevennes keyword
```js
const res = await call('search', { q: 'cévennes', sources: 'places,projects', per_page: 8 }).catch(() => ({ results: [] }));
await widget('cards', { items: (res?.results ?? []).map(r => ({ ...r, _rec: r.place ?? r.project ?? r.taxon ?? r.user ?? null })).filter(r => r._rec !== null).map(r => ({ title: r._rec?.display_name ?? r._rec?.title ?? '—', subtitle: r.type ?? '', image: r._rec?.icon })) });
```

### Eagle (taxa-focused)
```js
const res = await call('search', { q: 'eagle', sources: 'taxa', per_page: 5 }).catch(() => ({ results: [] }));
await widget('cards', { items: (res?.results ?? []).map(r => ({ ...r, _rec: r.taxon ?? r.record ?? null })).filter(r => r._rec !== null).map(r => ({ title: r._rec?.preferred_common_name ?? r._rec?.name ?? '—', subtitle: r._rec?.name ?? '', image: r._rec?.default_photo?.medium_url })) });
```

## Common mistakes

- **Forgetting that `search` returns mixed types** — each result has `r.type` ∈ {Taxon, Place, Project, User} and `r.record` shape varies. Always switch on `r.type`
- **Calling `search` with a single source** when the intent is fuzzy — leaving `sources` default keeps the polyvalent flavour
- **Hydrating every taxon result** — costs many round-trips. Hydrate only the top-1 or top-2
- **Showing raw `r.record.description`** — project descriptions can be long Markdown; clip to 200 chars
- **Image fallback chain** — taxa use `default_photo`, users `icon`, projects `icon`; build a chain rather than expecting one field
- **Treating `sources: "users"`** as default — it requires authentication on some endpoints; only add `users` if the user explicitly mentions a person
