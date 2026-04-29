---
id: inat-top-identifiers
name: Top identifiers of a species
description: Find the experts who validate a given taxon on iNaturalist — top identifiers leaderboard, profile of the #1 expert, summary of the taxon.
when: the user asks who are the experts of a species, who validates X, who identifies most of a taxon, or who to ask for an ID
servers: [inaturalist]
tools_used: [search_taxa, top_identifiers, get_taxon]
data_type: ranked identifier leaderboard for a taxon
components_used: [table, profile, kv]
layout:
  type: grid
  columns: 2
  arrangement: kv top-left, profile top-right, table full-width
---

## When to use

- "Who are the experts on Bombyx of oaks on iNaturalist?"
- "Who identifies the most Cortinarius mushrooms?"
- "Who validates beetle observations?"
- "Top identifiers of dragonflies in Europe"
- "Who can I ask to validate this lichen?"

## How to use

```js
// 1. Resolve the taxon
const taxa = await call('search_taxa', { q: 'Cortinarius', per_page: 1, rank: 'genus' });
const target = taxa?.results?.[0];
if (!target) {
  await widget('text', { content: 'Taxon not found.' });
  return;
}

// 2. Taxon detail (rank, ancestors, common name)
const [detail, ids] = await Promise.all([
  call('get_taxon', { id: target.id }).catch(() => null),
  call('top_identifiers', { taxon_id: target.id, quality_grade: 'research', per_page: 10 }).catch(() => ({ results: [] })),
]);

const idResults = ids?.results ?? [];

// 4. Render summary kv
await widget('kv', {
  title: detail?.preferred_common_name ?? detail?.name ?? target.name ?? 'Taxon',
  items: {
    Rank: detail?.rank ?? target.rank ?? '—',
    Family: detail?.ancestors?.find(a => a.rank === 'family')?.name ?? '—',
    'Total observations': detail?.observations_count ?? 0,
    'Total identifiers ranked': idResults.length,
  },
});

if (idResults.length === 0) {
  await widget('text', { content: 'No identifiers found for this taxon.' });
  return;
}

// 5. Profile of the #1 identifier
const champ = idResults[0]?.user;
if (champ) {
  await widget('profile', {
    title: champ.name ?? champ.login ?? 'Identifier',
    subtitle: '@' + (champ.login ?? '—'),
    image: champ.icon_url,
    fields: {
      'Identifications on this taxon': idResults[0]?.count ?? 0,
      'Total iNat IDs': champ.identifications_count ?? 0,
      Joined: champ.created_at?.slice(0, 10) ?? '—',
    },
  });
}

// 6. Full leaderboard table
await widget('table', {
  columns: ['Rank', 'Identifier', 'IDs on taxon', 'Total IDs'],
  rows: idResults.map((r, i) => [
    i + 1,
    r.user?.login ?? '—',
    r.count ?? 0,
    r.user?.identifications_count ?? 0,
  ]),
});
```

## Examples

### Cortinarius experts
```js
const t = (await call('search_taxa', { q: 'Cortinarius', rank: 'genus', per_page: 1 }))?.results?.[0];
if (!t) { await widget('text', { content: 'Taxon not found.' }); return; }
const ids = await call('top_identifiers', { taxon_id: t.id, per_page: 10 }).catch(() => ({ results: [] }));
await widget('table', { columns: ['Rank', 'User', 'IDs'], rows: (ids?.results ?? []).map((r, i) => [i + 1, r.user?.login ?? '—', r.count ?? 0]) });
```

### Top experts for golden eagle
```js
const t = (await call('search_taxa', { q: 'Aquila chrysaetos', per_page: 1 }))?.results?.[0];
if (!t) { await widget('text', { content: 'Taxon not found.' }); return; }
const ids = await call('top_identifiers', { taxon_id: t.id, per_page: 5, quality_grade: 'research' }).catch(() => ({ results: [] }));
const top = ids?.results?.[0]?.user;
if (!top) { await widget('text', { content: 'No top identifier found.' }); return; }
await widget('profile', { title: top.name ?? top.login ?? 'Identifier', subtitle: '@' + (top.login ?? '—'), image: top.icon_url });
```

## Common mistakes

- **Passing a taxon name** instead of `taxon_id` — `top_identifiers` requires the integer ID
- **Mixing identifiers with observers** — they are distinct roles. Use `top_identifiers` for validators, `observers_leaderboard` for collectors
- **Forgetting `quality_grade`** — without filter you'll include identifiers of casual / unverified obs and dilute expertise signal
- **Reading `r.user.identifications_count` as `r.count`** — `r.count` is the count *on this taxon*, the global count is on `r.user`
- **No fallback** when the taxon has very few identifiers (rare clades) — handle empty results gracefully
- **Truncating `taxa.results[0]` blindly** — if the search is ambiguous, double-check the taxon name before continuing
