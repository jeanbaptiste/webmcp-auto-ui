---
id: inat-top-observers
name: Top observers of an area or taxon
description: Surface the most active iNaturalist observers for a place / clade — leaderboard, global stats and profile of the #1 contributor.
when: the user asks who observes the most species, who are the top contributors, top observers, leaderboard for a place or taxon
servers: [inaturalist]
tools_used: [observers_leaderboard, search_observations, search_places]
data_type: ranked observer leaderboard
components_used: [table, stat-card, profile]
layout:
  type: grid
  columns: 2
  arrangement: leaderboard table full-width, stats row, profile of #1 below
---

## When to use

- "Who observes the most birds in Brittany?"
- "Top 10 mammal observers in Switzerland"
- "Leaderboard for butterflies in France"
- "Who's contributing the most to iNaturalist Belgium?"
- "Most active reptile observers in California"

## How to use

```js
// 1. Resolve the place if the user named one
const places = await call('search_places', { q: 'Brittany', per_page: 1 }).catch(() => ({ results: [] }));
const place = places?.results?.[0];

// 2. Leaderboard (ranked by species count by default for diversity)
const [board, obs] = await Promise.all([
  call('observers_leaderboard', { place_id: place?.id, taxon_name: 'Aves', order_by: 'species_count', per_page: 10 }).catch(() => ({ results: [] })),
  call('search_observations', { place_id: place?.id, taxon_name: 'Aves', per_page: 1 }).catch(() => ({ total_results: 0 })),
]);

const boardResults = board?.results ?? [];

if (boardResults.length === 0) {
  await widget('text', { content: 'No observers found for this area/taxon.' });
  return;
}

// 4. Render leaderboard
await widget('data-table', {
  columns: ['Rank', 'Observer', 'Species', 'Observations'],
  rows: boardResults.map((row, i) => [
    i + 1,
    row.user?.login ?? row.observer?.login ?? row.login ?? '—',
    row.species_count ?? 0,
    row.observation_count ?? 0,
  ]),
});

// 5. Stat cards
await widget('stat-card', { label: 'Total observations', value: obs?.total_results ?? 0, icon: 'eye' });
await widget('stat-card', { label: 'Top observer', value: boardResults[0].user?.login ?? boardResults[0].observer?.login ?? boardResults[0].login ?? '—', icon: 'star' });
await widget('stat-card', { label: '#1 species count', value: boardResults[0].species_count ?? 0, icon: 'leaf' });

// 6. Profile of the #1 contributor
const champ = boardResults[0].user ?? boardResults[0].observer ?? (boardResults[0].login ? boardResults[0] : null);
if (champ) {
  await widget('profile', {
    title: champ.name ?? champ.login ?? 'Observer',
    subtitle: '@' + (champ.login ?? '—'),
    image: champ.icon_url,
    fields: {
      'Species observed': boardResults[0].species_count ?? 0,
      Observations: boardResults[0].observation_count ?? 0,
      Joined: champ.created_at?.slice(0, 10) ?? '—',
    },
  });
}
```

## Examples

### Top 10 mammal observers in Switzerland
```js
const place = (await call('search_places', { q: 'Switzerland', per_page: 1 }))?.results?.[0];
if (!place) { await widget('text', { content: 'Place not found.' }); return; }
const board = await call('observers_leaderboard', { place_id: place.id, taxon_name: 'Mammalia', per_page: 10 }).catch(() => ({ results: [] }));
await widget('data-table', { columns: ['Rank', 'User', 'Species', 'Obs.'], rows: (board?.results ?? []).map((r, i) => [i + 1, r.user?.login ?? r.observer?.login ?? r.login ?? '—', r.species_count ?? 0, r.observation_count ?? 0]) });
```

### World leaderboard for sharks
```js
const board = await call('observers_leaderboard', { taxon_name: 'Selachimorpha', order_by: 'observation_count', per_page: 20 }).catch(() => ({ results: [] }));
await widget('data-table', { columns: ['Rank', 'User', 'Obs.'], rows: (board?.results ?? []).map((r, i) => [i + 1, r.user?.login ?? r.observer?.login ?? r.login ?? '—', r.observation_count ?? 0]) });
```

## Common mistakes

- **Sorting by `observation_count` only** — rewards photographing the same robin 1000 times. Use `species_count` for diversity rankings
- **Skipping `search_places`** — passing `place: "Brittany"` won't work, the API needs `place_id`
- **No taxon filter** — a global leaderboard mixes everything; constrain with `taxon_name` for meaningful rankings
- **Showing `user.icon_url` thumbnail** — it's tiny (48px), use `user.icon` (the medium URL) for the profile header
- **Confusing `species_count` (uniques)** with `observation_count` (raw counts) in the table — label them clearly
- **Forgetting that some users disable their leaderboard ranking** — the result list may have gaps
