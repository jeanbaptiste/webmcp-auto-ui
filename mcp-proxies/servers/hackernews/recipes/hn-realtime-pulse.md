---
id: hn-realtime-pulse
name: HackerNews real-time pulse
description: Flux temps-réel HN — timeline chronologique, breakdown par type, derniers posts.
when: the user asks for the latest, real-time, or most recent HackerNews activity
servers: [hackernews]
tools_used: [get-latest-posts]
data_type: timeline
components_used: [timeline, stat-card, table]
layout:
  type: grid
  columns: 2
  arrangement: KPIs row, full-width timeline, recent table
---

## When to use

The user wants the live chronological flow, not the editorial ranking:
- "What's the real-time pulse of HackerNews?"
- "Show me the latest posts on HN"
- "Most recent activity on HackerNews"
- "Quel est le flux HN en ce moment ?"
- "What was just posted on HN?"

This complements `hn-front-page-overview` (editorial) with a strict reverse-chronological feed.

## How to use

1. **Fetch latest posts** (no tag filter — capture all activity):
   ```js
   const res = await call('get-latest-posts', { hitsPerPage: 50 });
   const posts = (res?.hits ?? []).filter(p => p);
   if (posts.length === 0) return widget('text', { content: 'No recent activity (API rate-limited?).' });
   ```

2. **Breakdown by content type**:
   ```js
   const types = { story: 0, comment: 0, show_hn: 0, ask_hn: 0, poll: 0 };
   for (const p of posts) {
     for (const t of (p?._tags ?? [])) if (t in types) types[t]++;
   }
   ```

3. **Stat-cards**:
   ```js
   await widget('stat-card', { label: 'Latest items', value: posts.length, icon: 'activity' });
   await widget('stat-card', { label: 'Stories', value: types.story, icon: 'file-text' });
   await widget('stat-card', { label: 'Comments', value: types.comment, icon: 'message-circle' });
   await widget('stat-card', { label: 'Show HN', value: types.show_hn, icon: 'eye' });
   ```

4. **Timeline of recent items**:
   ```js
   await widget('timeline', {
     events: posts.slice(0, 30).map(p => ({
       date: p?.created_at ?? new Date().toISOString(),
       title: p?.title || p?.story_title || '(comment)',
       description: `by ${p?.author ?? '—'} · ${p?.points ?? 0} pts`,
       url: p?.url || `https://news.ycombinator.com/item?id=${p?.objectID ?? ''}`
     }))
   });
   ```

5. **Table of newest items**:
   ```js
   await widget('table', {
     columns: ['Time', 'Type', 'Title', 'Author'],
     rows: posts.map(p => {
       const tag = (p?._tags ?? []).find(t => ['story', 'comment', 'show_hn', 'ask_hn', 'poll'].includes(t)) || '?';
       let time = '—';
       try {
         const d = new Date(p?.created_at);
         if (Number.isFinite(d.getTime())) time = d.toISOString().slice(11, 16);
       } catch {}
       return [time, tag, p?.title || p?.story_title || '(comment)', p?.author ?? '—'];
     })
   });
   ```

## Examples

### Live pulse — all types
```js
const res = await call('get-latest-posts', { hitsPerPage: 50 });
const hits = (res?.hits ?? []).filter(p => p);
await widget('stat-card', { label: 'Last 50', value: hits.length, icon: 'activity' });
await widget('timeline', {
  events: hits.slice(0, 20).map(p => ({
    date: p?.created_at ?? new Date().toISOString(),
    title: p?.title || p?.story_title || '(comment)',
    description: `by ${p?.author ?? '—'}`
  }))
});
```

### Latest stories only
```js
const res = await call('get-latest-posts', { tags: ['story'], hitsPerPage: 30 });
const hits = (res?.hits ?? []).filter(p => p);
await widget('timeline', {
  events: hits.map(p => ({
    date: p?.created_at ?? new Date().toISOString(),
    title: p?.title ?? '(untitled)',
    description: `${p?.points ?? 0} pts · ${p?.num_comments ?? 0} comments`,
    url: p?.url
  }))
});
await widget('table', {
  columns: ['Title', 'Author', 'Posted'],
  rows: hits.map(p => [p?.title ?? '(untitled)', p?.author ?? '—', p?.created_at?.slice(0, 19).replace('T', ' ') ?? '—'])
});
```

### Show HN feed
```js
const res = await call('get-latest-posts', { tags: ['show_hn'], hitsPerPage: 20 });
const hits = (res?.hits ?? []).filter(p => p);
await widget('timeline', {
  events: hits.map(p => ({ date: p?.created_at ?? new Date().toISOString(), title: p?.title ?? '(untitled)', description: p?.author ?? '—', url: p?.url }))
});
```

## Common mistakes

- **Confusing latest with front page**: `get-latest-posts` is reverse-chronological; `get-front-page` is HN-ranked — they answer different questions
- **No tag filter on a "stories only" request**: by default the latest feed is dominated by comments — pass `tags: ['story']` if the user wants stories
- **Using `points` as a sort key**: most fresh items have `points: 0` or `null` — don't sort by score in this recipe, the axis is time
- **Timezone mismatch on display**: `created_at` is UTC ISO; convert with `toLocaleString()` if a local time is needed for the user
- **Truncating the timeline to 5**: a real-time feed needs 20-30 events to feel alive — don't shrink it like a "top stories" list
- **Reading `p.title` on comments**: comments have no title — fall back to `story_title` or `'(comment)'`
