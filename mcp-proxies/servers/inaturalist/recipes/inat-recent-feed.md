---
id: inat-recent-feed
name: Live naturalist activity feed
description: Show what the iNaturalist community is identifying right now — recent taxa timeline, photo strip and pace stats.
when: the user wants a live feed, "what's being observed now", recent identifications, latest taxa, naturalist news
servers: [inaturalist]
tools_used: [recent_taxa, search_observations]
data_type: live feed of recently identified taxa
components_used: [timeline, gallery, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: timeline full-width, gallery below, stats row at bottom
---

## When to use

- "What's being observed on iNaturalist right now?"
- "Latest plants identified this week"
- "Recent fungal observations"
- "Live feed of bird IDs"
- "What naturalists are spotting this hour"

## How to use

```js
// 1. Pull the live identification feed (research grade keeps the signal clean)
const feed = await call('recent_taxa', {
  rank: 'species',
  quality_grade: 'research',
  per_page: 30,
});

// 2. Sample observations for each taxon to populate the gallery
const samples = await Promise.all(
  feed.results.slice(0, 12).map(t =>
    call('search_observations', { taxon_id: t.id, per_page: 1, quality_grade: 'research' }),
  ),
);

// 3. Timeline of recent IDs
await widget('timeline', {
  events: feed.results.slice(0, 20).map(t => ({
    title: t.preferred_common_name || t.name,
    subtitle: t.name,
    icon: 'leaf',
    image: t.default_photo?.square_url,
    meta: t.rank,
  })),
});

// 4. Photo strip
const images = samples
  .map((s, i) => {
    const o = s.results?.[0];
    if (!o?.photos?.length) return null;
    return {
      src: o.photos[0].url.replace('square', 'medium'),
      caption: `${feed.results[i].preferred_common_name || feed.results[i].name} — ${o.place_guess}`,
    };
  })
  .filter(Boolean);
await widget('gallery', { images });

// 5. Pace stats
await widget('stat-card', { label: 'Recent species', value: feed.results.length, icon: 'sparkles' });
await widget('stat-card', { label: 'Quality grade', value: 'research', icon: 'check-circle' });
await widget('stat-card', { label: 'Snapshot taken', value: new Date().toISOString().slice(0, 16).replace('T', ' '), icon: 'clock' });
```

## Examples

### Latest fungi this week
```js
const feed = await call('recent_taxa', { taxon_id: 47170, per_page: 20, rank: 'species' }); // 47170 = Fungi
await widget('timeline', { events: feed.results.map(t => ({ title: t.preferred_common_name || t.name, subtitle: t.name, image: t.default_photo?.square_url })) });
```

### Live bird IDs
```js
const feed = await call('recent_taxa', { taxon_id: 3, per_page: 15, quality_grade: 'research' });
await widget('gallery', { images: feed.results.filter(t => t.default_photo).map(t => ({ src: t.default_photo.medium_url, caption: t.preferred_common_name })) });
```

## Common mistakes

- **Calling without `quality_grade`** — the feed is flooded with unverified IDs; `research` keeps it meaningful
- **Skipping the rank filter** — without `rank: "species"` the feed mixes families and genera, hurting the "live wildlife" feel
- **Treating `recent_taxa` as observations** — each entry is a taxon, not an observation; you need a follow-up `search_observations` call for actual photos
- **Hammering `search_observations` for all 30 results** — cap to 10-12 to keep the gallery responsive
- **Hardcoding a date in the timeline** — the feed has no observation date, the timeline is "recently identified" not "recently observed"
- **Square thumbnails on the gallery** — replace `"square"` with `"medium"` for visible photos
