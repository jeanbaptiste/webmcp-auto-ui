---
id: inat-bioblitz-project
name: Bioblitz / citizen-science project dashboard
description: Render a one-shot dashboard for an iNaturalist project — stats, observation map, photo gallery, contributor leaderboard.
when: the user mentions a bioblitz, a citizen-science project, asks about an iNaturalist project, or wants to inspect a campaign
servers: [inaturalist]
tools_used: [search_projects, search_observations, observers_leaderboard]
data_type: project metadata + observations + contributors
components_used: [stat-card, table, map, gallery]
layout:
  type: grid
  columns: 2
  arrangement: stat row top, map + gallery side-by-side, leaderboard below
---

## When to use

- "Show me the Camargue Bioblitz project"
- "Bioblitzes around Mont Ventoux"
- "What's the City Nature Challenge Paris project?"
- "Citizen-science campaigns in the Alps"
- "Browse iNaturalist projects about pollinators"

## How to use

```js
// 1. Find the project
const projects = await call('search_projects', { q: 'Bioblitz Camargue', per_page: 5 });
const project = projects?.results?.[0];
if (!project) {
  await widget('text', { content: 'No project found.' });
  return;
}

// 2. Observations attached to the project (use the project's place_id as a proxy)
const obs = await call('search_observations', {
  place_id: project.place_id,
  d1: project.start_time?.slice(0, 10),
  d2: project.end_time?.slice(0, 10),
  per_page: 100,
}).catch(() => ({ results: [], total_results: 0 }));

// 3. Contributor leaderboard for the project's place
const board = await call('observers_leaderboard', {
  place_id: project.place_id,
  d1: project.start_time?.slice(0, 10),
  d2: project.end_time?.slice(0, 10),
  per_page: 10,
}).catch(() => ({ results: [] }));

// 4. Render stats
await widget('stat-card', { label: 'Project', value: project.title ?? '—', icon: 'flag' });
await widget('stat-card', { label: 'Observations', value: obs?.total_results ?? 0, icon: 'eye' });
await widget('stat-card', { label: 'Contributors', value: board?.results?.length ?? 0, icon: 'users' });
await widget('stat-card', { label: 'Started', value: project.start_time?.slice(0, 10) ?? '—', icon: 'calendar' });

// 5. Map of project observations
await widget('map', {
  zoom: 8,
  cluster: true,
  markers: (obs?.results ?? [])
    .filter(o => o.geojson?.coordinates)
    .map(o => ({
      lat: o.geojson.coordinates[1],
      lon: o.geojson.coordinates[0],
      label: o.species_guess ?? o.taxon?.name ?? '',
    })),
});

// 6. Photo gallery
await widget('gallery', {
  images: (obs?.results ?? [])
    .filter(o => o.photos?.length > 0 && o.photos[0]?.url)
    .slice(0, 24)
    .map(o => ({
      src: o.photos[0].url.replace('square', 'medium'),
      caption: `${o.species_guess ?? o.taxon?.name ?? 'Unknown'} — ${o.user?.login ?? 'anon'}`,
    })),
});

// 7. Contributor leaderboard
await widget('data-table', {
  columns: ['Rank', 'User', 'Species', 'Observations'],
  rows: (board?.results ?? []).map((r, i) => [i + 1, r.user?.login ?? '—', r.species_count ?? 0, r.observation_count ?? 0]),
});
```

## Examples

### City Nature Challenge Paris
```js
const p = (await call('search_projects', { q: 'City Nature Challenge Paris', per_page: 1 }))?.results?.[0];
if (!p) { await widget('text', { content: 'No project found.' }); return; }
await widget('stat-card', { label: p.title ?? 'Project', value: p.observations_count ?? '—', icon: 'flag' });
const board = await call('observers_leaderboard', { place_id: p.place_id, per_page: 10 }).catch(() => ({ results: [] }));
await widget('data-table', { columns: ['Rank', 'User', 'Species'], rows: (board?.results ?? []).map((r, i) => [i + 1, r.user?.login ?? '—', r.species_count ?? 0]) });
```

### Pollinator campaigns
```js
const list = await call('search_projects', { q: 'pollinator', type: 'collection', per_page: 8 });
await widget('cards', { items: (list?.results ?? []).map(p => ({ title: p.title ?? '—', subtitle: p.slug ?? '', image: p.icon, description: p.description?.slice(0, 200) ?? '' })) });
```

## Common mistakes

- **Treating `project.place_id` as the project's "scope" exhaustively** — a project may include observations outside that place; a true filter is `project_id` (not yet exposed by this MCP) so use date range as well
- **Filtering observations without dates** — bioblitzes are usually short windows; without `d1`/`d2` you mix old + new data
- **Ignoring `type: "umbrella"` projects** — they aggregate child projects and rarely have direct observations
- **Showing every observation on the map** without clustering — bioblitzes can hold thousands of points
- **Hardcoding the project title** — use `search_projects` with a flexible `q`, the user's wording rarely matches the exact name
- **Forgetting `description?.slice(0, 200)`** in cards — project descriptions can be very long Markdown
