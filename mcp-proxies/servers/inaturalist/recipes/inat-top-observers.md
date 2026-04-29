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
const places = await call('search_places', { q: 'Brittany', per_page: 1 });
const place = places.results[0];

// 2. Leaderboard (ranked by species count by default for diversity)
const board = await call('observers_leaderboard', {
  place_id: place?.id,
  taxon_name: 'Aves',
  order_by: 'species_count',
  per_page: 10,
});

// 3. Aggregate stats over the whole region/taxon
const obs = await call('search_observations', {
  place_id: place?.id, taxon_name: 'Aves', per_page: 1,
});

// 4. Render leaderboard
await widget('table', {
  columns: ['Rank', 'Observer', 'Species', 'Observations'],
  rows: board.results.map((row, i) => [
    i + 1,
    row.user.login,
    row.species_count,
    row.observation_count,
  ]),
});

// 5. Stat cards
await widget('stat-card', { label: 'Total observations', value: obs.total_results, icon: 'eye' });
await widget('stat-card', { label: 'Top observer', value: board.results[0].user.login, icon: 'star' });
await widget('stat-card', { label: '#1 species count', value: board.results[0].species_count, icon: 'leaf' });

// 6. Profile of the #1 contributor
const champ = board.results[0].user;
await widget('profile', {
  title: champ.name || champ.login,
  subtitle: '@' + champ.login,
  image: champ.icon_url,
  fields: {
    'Species observed': board.results[0].species_count,
    Observations: board.results[0].observation_count,
    Joined: champ.created_at?.slice(0, 10),
  },
});
```

## Examples

### Top 10 mammal observers in Switzerland
```js
const place = (await call('search_places', { q: 'Switzerland', per_page: 1 })).results[0];
const board = await call('observers_leaderboard', { place_id: place.id, taxon_name: 'Mammalia', per_page: 10 });
await widget('table', { columns: ['Rank', 'User', 'Species', 'Obs.'], rows: board.results.map((r, i) => [i + 1, r.user.login, r.species_count, r.observation_count]) });
```

### World leaderboard for sharks
```js
const board = await call('observers_leaderboard', { taxon_name: 'Selachimorpha', order_by: 'observation_count', per_page: 20 });
await widget('table', { columns: ['Rank', 'User', 'Obs.'], rows: board.results.map((r, i) => [i + 1, r.user.login, r.observation_count]) });
```

## Common mistakes

- **Sorting by `observation_count` only** — rewards photographing the same robin 1000 times. Use `species_count` for diversity rankings
- **Skipping `search_places`** — passing `place: "Brittany"` won't work, the API needs `place_id`
- **No taxon filter** — a global leaderboard mixes everything; constrain with `taxon_name` for meaningful rankings
- **Showing `user.icon_url` thumbnail** — it's tiny (48px), use `user.icon` (the medium URL) for the profile header
- **Confusing `species_count` (uniques)** with `observation_count` (raw counts) in the table — label them clearly
- **Forgetting that some users disable their leaderboard ranking** — the result list may have gaps
