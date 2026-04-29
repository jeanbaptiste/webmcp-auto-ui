---
id: nasa-apod-today
name: Show NASA's Astronomy Picture of the Day
description: Hero gallery, scientific explanation and credits for today's APOD
when: the user asks for today's APOD, the NASA picture of the day, or an astronomy image for a specific date
servers: [nasa]
tools_used: [nasa_apod]
data_type: editorial image of the day
components_used: [gallery, text, kv]
layout:
  type: stack
  arrangement: hero gallery on top, explanation prose below, kv metadata as footer
---

## When to use

The user wants the editorial image NASA publishes every day:
- "What is the NASA picture of the day?"
- "Show me today's APOD"
- "Astronomy picture for 2026-04-29"
- "What did NASA share today?"
- "APOD du jour"

The APOD is a single curated image (or video) with a written explanation by professional astronomers. The recipe shows the image as a hero, the explanation as prose, and the metadata in a compact key-value block.

## How to use

```js
// 1. Fetch today's APOD (or a specific date)
const apod = await call('nasa_apod', { date: '2026-04-29' }).catch(() => null);
if (!apod) return widget('text', { content: 'APOD unavailable (rate-limit or future date).' });

// 2. Hero image (single-item gallery, HD URL — skip when video)
const heroSrc = apod?.media_type === 'video' ? apod?.thumbnail_url : (apod?.hdurl || apod?.url);
if (heroSrc) {
  await widget('gallery', {
    images: [{
      src: heroSrc,
      alt: apod?.title ?? 'APOD',
      caption: apod?.title ?? 'APOD'
    }]
  });
}

// 3. The scientific explanation as prose
await widget('text', {
  title: apod?.title ?? 'APOD',
  body: apod?.explanation ?? '(no explanation available)'
});

// 4. Metadata block (date, credits, media type)
await widget('kv', {
  items: [
    { label: 'Date', value: apod?.date ?? '—' },
    { label: 'Media', value: apod?.media_type ?? '—' },
    { label: 'Copyright', value: apod?.copyright ?? 'Public domain' }
  ]
});
```

When `media_type === 'video'`, set `thumbs: true` in the call to get a thumbnail URL usable inside the gallery.

## Examples

### Today's image (default)
```js
const apod = await call('nasa_apod', { date: new Date().toISOString().slice(0, 10) }).catch(() => null);
if (!apod) return widget('text', { content: 'APOD unavailable.' });
const src = apod?.hdurl || apod?.url;
if (src) await widget('gallery', { images: [{ src, alt: apod?.title ?? 'APOD', caption: apod?.title ?? 'APOD' }] });
await widget('text', { title: apod?.title ?? 'APOD', body: apod?.explanation ?? '' });
await widget('kv', { items: [{ label: 'Date', value: apod?.date ?? '—' }, { label: 'Copyright', value: apod?.copyright ?? 'Public domain' }] });
```

### A specific date (video APOD)
```js
const apod = await call('nasa_apod', { date: '2024-12-25', thumbs: true }).catch(() => null);
if (!apod) return widget('text', { content: 'APOD unavailable.' });
const src = apod?.media_type === 'video' ? apod?.thumbnail_url : (apod?.hdurl || apod?.url);
if (src) await widget('gallery', { images: [{ src, alt: apod?.title ?? 'APOD', caption: apod?.title ?? 'APOD' }] });
await widget('text', { title: apod?.title ?? 'APOD', body: apod?.explanation ?? '' });
```

## Common mistakes

- Using `apod.url` (preview) instead of `apod.hdurl` (high resolution) — always prefer `hdurl` when available
- Forgetting that `media_type` can be `video` — the gallery needs a thumbnail in that case (`thumbs: true`)
- Calling without `date` — the API does default to today, but explicit dates make the recipe deterministic
- Inlining the full explanation as a caption — the prose is too long, use `text` widget for it
- Skipping the credits — many APODs are copyrighted by amateur astronomers and require attribution
