---
id: inat-user-profile
name: Profile of an iNaturalist contributor
description: Spotlight a naturalist contributor — profile, gallery of their observations, map of their hotspots and top species table.
when: the user asks about a specific iNaturalist user, contributor, or observer's activity
servers: [inaturalist]
tools_used: [search, search_observations]
data_type: user activity (profile + obs + hotspots)
components_used: [profile, gallery, map, table]
layout:
  type: grid
  columns: 2
  arrangement: profile + map side-by-side, gallery + table below
---

## When to use

- "What does the user jb-photo do on iNaturalist?"
- "Profile of the observer tela-botanica"
- "Show me the activity of @elias-bdr"
- "What's iNat user 'naturalist42' working on?"
- "Recent observations of contributor X"

## How to use

```js
// 1. Resolve the user via cross-entity search
const res = await call('search', { q: 'tela-botanica', sources: 'users', per_page: 1 }).catch(() => ({ results: [] }));
const user = res?.results?.[0];
if (!user) {
  await widget('text', { content: 'User not found.' });
  return;
}

// 2. Their observations
const obs = await call('search_observations', {
  user_id: user.id,
  per_page: 100,
  quality_grade: 'research',
}).catch(() => ({ results: [] }));
const myObs = (obs?.results ?? []).slice(0, 50);

// 3. Profile
await widget('profile', {
  title: user.name ?? user.login ?? 'User',
  subtitle: '@' + (user.login ?? '—'),
  image: user.icon_url ?? user.icon,
  fields: {
    'Joined': user.created_at?.slice(0, 10) ?? '—',
    'Total observations': user.observations_count ?? 0,
    'Identifications': user.identifications_count ?? 0,
    'Species observed': user.species_count ?? 0,
  },
});

// 4. Map of their hotspots
await widget('map', {
  zoom: 5,
  cluster: true,
  markers: myObs
    .filter(o => o.geojson?.coordinates)
    .map(o => ({
      lat: o.geojson.coordinates[1],
      lon: o.geojson.coordinates[0],
      label: o.species_guess ?? o.taxon?.name ?? '',
      popup: o.observed_on ?? '',
    })),
});

// 5. Photo gallery of their work
await widget('gallery', {
  images: myObs
    .filter(o => o.photos?.length > 0 && o.photos[0]?.url)
    .map(o => ({
      src: o.photos[0].url.replace('square', 'medium'),
      caption: `${o.species_guess ?? o.taxon?.name ?? 'Unknown'} — ${o.place_guess ?? ''}`,
    })),
});

// 6. Top species they've observed (count by taxon)
const counts = {};
for (const o of myObs) {
  const k = o.taxon?.preferred_common_name ?? o.taxon?.name;
  if (k) counts[k] = (counts[k] || 0) + 1;
}
const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
await widget('data-table', {
  columns: ['Species', 'Observations'],
  rows,
});
```

## Examples

### Resolve a specific user
```js
const res = await call('search', { q: 'jb-photo', sources: 'users', per_page: 1 }).catch(() => ({ results: [] }));
const u = res?.results?.[0];
if (!u) { await widget('text', { content: 'User not found.' }); return; }
await widget('profile', { title: u.name ?? u.login ?? 'User', subtitle: '@' + (u.login ?? '—'), image: u.icon_url, fields: { Joined: u.created_at?.slice(0, 10) ?? '—', 'Total obs': u.observations_count ?? 0 } });
```

### Map a user's hotspots
```js
const res = await call('search', { q: 'naturalist42', sources: 'users', per_page: 1 }).catch(() => ({ results: [] }));
const u = res?.results?.[0];
if (!u) { await widget('text', { content: 'User not found.' }); return; }
const all = await call('search_observations', { user_id: u.id, per_page: 200, quality_grade: 'research' }).catch(() => ({ results: [] }));
const mine = (all?.results ?? []).filter(o => o.geojson?.coordinates);
await widget('map', { zoom: 5, cluster: true, markers: mine.map(o => ({ lat: o.geojson.coordinates[1], lon: o.geojson.coordinates[0] })) });
```

## Common mistakes

- **Assuming the MCP exposes a `user_id` filter on `search_observations`** — it doesn't here, you must filter client-side by `o.user?.id` after a paginated fetch
- **Missing user not found** — `search` may return zero rows for unknown logins; always check `res.results[0]` before dereferencing
- **Mixing icon fields** — `icon_url` is the medium-size avatar, `icon` is sometimes a square thumbnail; build a fallback chain
- **Showing every observation** — cap to ~50 photos for the gallery; users with 10K+ obs would crash the renderer
- **Raw `species_count`** — the user's lifetime species count, not their species in the current sample; label clearly
- **No quality filter** — casual obs can include unverified guesses, mute them with `quality_grade: "research"` for a cleaner profile
