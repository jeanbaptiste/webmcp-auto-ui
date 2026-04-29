---
id: nasa-apod-archive
name: Browse a range of past Astronomy Pictures of the Day
description: Carousel, cards and timeline for an APOD date range or random sample
when: the user asks for the APOD of the week, a month archive, random astro pictures, or a date range of APODs
servers: [nasa]
tools_used: [nasa_apod]
data_type: dated archive of editorial images
components_used: [carousel, cards, timeline]
layout:
  type: stack
  arrangement: carousel on top, cards grid in the middle, chronological timeline below
---

## When to use

The user wants more than one APOD — a span of dates or a random sample to explore:
- "Show me the APODs of the past week"
- "APOD archive April 2026"
- "Random astronomy pictures from NASA"
- "What did NASA publish between March 1 and March 15?"

The recipe organises the response so the user can flip through (carousel), scan thumbnails (cards) and read it chronologically (timeline).

## How to use

```js
// 1. Fetch an explicit range OR a random count
const apods = await call('nasa_apod', {
  start_date: '2026-04-22',
  end_date:   '2026-04-29'
});
// Alternative random: await call('nasa_apod', { count: 12 });

// Sort chronologically (API returns ascending already, defensive sort)
apods.sort((a, b) => a.date.localeCompare(b.date));

// 2. Carousel: HD images, large rotation
await widget('carousel', {
  items: apods.map(a => ({
    image: a.hdurl || a.url,
    title: a.title,
    subtitle: a.date
  }))
});

// 3. Cards grid: title + thumbnail + date
await widget('cards', {
  items: apods.map(a => ({
    title: a.title,
    image: a.url,
    subtitle: a.date,
    description: a.explanation.slice(0, 140) + '...'
  }))
});

// 4. Timeline: one event per APOD
await widget('timeline', {
  events: apods.map(a => ({
    date: a.date,
    title: a.title,
    description: a.copyright || 'NASA / public domain'
  }))
});
```

## Examples

### Past week
```js
const today = new Date();
const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
const apods = await call('nasa_apod', {
  start_date: weekAgo.toISOString().slice(0, 10),
  end_date:   today.toISOString().slice(0, 10)
});
await widget('carousel', { items: apods.map(a => ({ image: a.hdurl, title: a.title, subtitle: a.date })) });
await widget('cards', { items: apods.map(a => ({ title: a.title, image: a.url, subtitle: a.date })) });
```

### 15 random pictures
```js
const apods = await call('nasa_apod', { count: 15 });
await widget('carousel', { items: apods.filter(a => a.media_type === 'image').map(a => ({ image: a.hdurl, title: a.title })) });
await widget('cards', { items: apods.map(a => ({ title: a.title, image: a.url, subtitle: a.date })) });
```

## Common mistakes

- Asking ranges longer than ~30 days — APOD throttles long ranges, prefer pagination by month
- Forgetting `media_type === 'video'` items — they have no `hdurl`; filter them out of the carousel or use thumbnails
- Sorting alphabetically instead of by date — `apods.sort((a, b) => a.date.localeCompare(b.date))`
- Cards with the full explanation — truncate to ~140 chars; let the user click into a detail view
- Mixing `count` with `start_date`/`end_date` — pick one mode, the API rejects mixing them
