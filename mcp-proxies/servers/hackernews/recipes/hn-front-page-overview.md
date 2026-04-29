---
id: hn-front-page-overview
name: HackerNews front page overview
description: Vue d'ensemble lisible de la front page HN — KPIs, top stories en cards, tableau triable.
when: the user asks what's hot on HackerNews, the current front page, or trending stories today
servers: [hackernews]
tools_used: [get-front-page]
data_type: dashboard
components_used: [stat-card, cards, table]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards row at top, top-5 cards on the left, full table on the right
---

## When to use

The user wants a quick editorial snapshot of HackerNews:
- "What's hot on Hacker News today?"
- "Show me the HN front page"
- "What are people reading on HackerNews right now?"
- "Top stories on HN"
- "Donne-moi un aperçu de la front page HN"

The `get-front-page` tool returns 30 stories ranked by the HN algorithm, with title, url, author, points, num_comments, created_at.

## How to use

1. **Fetch the front page**:
   ```js
   const res = await call('get-front-page', { hitsPerPage: 30 });
   const stories = res.hits;
   ```

2. **Aggregate KPIs** (total points, total comments, top score):
   ```js
   const totalPoints = stories.reduce((s, x) => s + (x.points || 0), 0);
   const totalComments = stories.reduce((s, x) => s + (x.num_comments || 0), 0);
   const topScore = Math.max(...stories.map(s => s.points || 0));
   ```

3. **Render stat-cards**:
   ```js
   await widget('stat-card', { label: 'Stories', value: stories.length, icon: 'list' });
   await widget('stat-card', { label: 'Total points', value: totalPoints, icon: 'arrow-up' });
   await widget('stat-card', { label: 'Total comments', value: totalComments, icon: 'message-circle' });
   await widget('stat-card', { label: 'Top score', value: topScore, icon: 'flame' });
   ```

4. **Top 5 stories in cards** (visual highlight):
   ```js
   await widget('cards', {
     items: stories.slice(0, 5).map(s => ({
       title: s.title,
       subtitle: `${s.points} pts · ${s.num_comments} comments · by ${s.author}`,
       url: s.url || `https://news.ycombinator.com/item?id=${s.objectID}`,
       body: new URL(s.url || 'https://news.ycombinator.com').hostname
     }))
   });
   ```

5. **Full sortable table** of the 30 stories:
   ```js
   await widget('table', {
     columns: ['Title', 'Points', 'Comments', 'Author', 'Domain'],
     rows: stories.map(s => [
       s.title,
       s.points || 0,
       s.num_comments || 0,
       s.author,
       s.url ? new URL(s.url).hostname : 'news.ycombinator.com'
     ])
   });
   ```

## Examples

### Standard front page snapshot
```js
const res = await call('get-front-page', {});
const stories = res.hits;

await widget('stat-card', { label: 'Stories', value: stories.length, icon: 'list' });
await widget('stat-card', { label: 'Top score', value: Math.max(...stories.map(s => s.points)), icon: 'flame' });

await widget('cards', {
  items: stories.slice(0, 5).map(s => ({
    title: s.title,
    subtitle: `${s.points} pts · by ${s.author}`,
    url: s.url || `https://news.ycombinator.com/item?id=${s.objectID}`
  }))
});

await widget('table', {
  columns: ['Title', 'Points', 'Comments', 'Author'],
  rows: stories.map(s => [s.title, s.points, s.num_comments, s.author])
});
```

### Extended view (50 stories)
```js
const res = await call('get-front-page', { hitsPerPage: 50 });
await widget('table', {
  columns: ['#', 'Title', 'Points', 'Comments'],
  rows: res.hits.map((s, i) => [i + 1, s.title, s.points, s.num_comments])
});
```

## Common mistakes

- **Forgetting Ask HN / Show HN have no `url`**: fall back to `https://news.ycombinator.com/item?id=${objectID}` when `url` is missing
- **Ignoring `objectID`**: this is the HN item id needed to link to the discussion thread, not the story id
- **Not handling `points: null`**: poll items or very recent stories may have null — coerce with `|| 0` before sums
- **Truncating the table to 5 rows**: the table is the drill-down — keep all 30 (or 50) rows so the user can scan beyond the cards
- **Using `created_at` as a Date directly**: it's an ISO string; use `new Date(s.created_at)` if you need to format it
- **Calling `get-front-page` with `hitsPerPage > 100` "to be safe"**: the front page only has ~30 active stories; larger values just pad with older items
