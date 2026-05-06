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

> Each numbered block below is **self-contained** — it re-fetches the front page so it can run standalone in a recipe runner.

1. **Fetch the front page**:
   ```js
   const res = await call('get-front-page', { hitsPerPage: 30 });
   const stories = (res?.hits ?? []).filter(s => s);
   if (stories.length === 0) return widget('text', { content: 'No stories on the front page right now.' });
   const items = stories.slice(0, 5).map(s => ({
     title: s?.title ?? '(untitled)',
     subtitle: `${s?.points ?? 0} pts · ${s?.num_comments ?? 0} comments · by ${s?.author ?? '—'}`,
     url: s?.url || `https://news.ycombinator.com/item?id=${s?.objectID ?? ''}`
   }));
   await widget('cards', { items: items.length ? items : [{ title: 'No stories', subtitle: '—' }] });
   ```

2. **Aggregate KPIs** (total points, total comments, top score):
   ```js
   const res = await call('get-front-page', { hitsPerPage: 30 });
   const stories = (res?.hits ?? []).filter(s => s);
   const totalPoints = stories.reduce((s, x) => s + (x?.points || 0), 0);
   const totalComments = stories.reduce((s, x) => s + (x?.num_comments || 0), 0);
   const scores = stories.map(s => s?.points || 0).filter(Number.isFinite);
   const topScore = scores.length > 0 ? Math.max(...scores) : 0;
   await widget('text', { content: `Snapshot: ${stories.length} stories, ${totalPoints} pts, top ${topScore}.` });
   ```

3. **Render stat-cards**:
   ```js
   const res = await call('get-front-page', { hitsPerPage: 30 });
   const stories = (res?.hits ?? []).filter(s => s);
   const totalPoints = stories.reduce((s, x) => s + (x?.points || 0), 0);
   const totalComments = stories.reduce((s, x) => s + (x?.num_comments || 0), 0);
   const topScore = stories.length > 0 ? Math.max(...stories.map(s => s?.points || 0)) : 0;
   await widget('stat-card', { label: 'Stories', value: Math.max(stories.length, 1), icon: 'list' });
   await widget('stat-card', { label: 'Total points', value: Math.max(totalPoints, 1), icon: 'arrow-up' });
   await widget('stat-card', { label: 'Total comments', value: Math.max(totalComments, 1), icon: 'message-circle' });
   await widget('stat-card', { label: 'Top score', value: Math.max(topScore, 1), icon: 'flame' });
   ```

4. **Top 5 stories in cards** (visual highlight):
   ```js
   const res = await call('get-front-page', { hitsPerPage: 30 });
   const stories = (res?.hits ?? []).filter(s => s);
   const items = stories.slice(0, 5).map(s => {
     let host = 'news.ycombinator.com';
     try { if (s?.url) host = new URL(s.url).hostname; } catch {}
     return {
       title: s?.title ?? '(untitled)',
       subtitle: `${s?.points ?? 0} pts · ${s?.num_comments ?? 0} comments · by ${s?.author ?? '—'}`,
       url: s?.url || `https://news.ycombinator.com/item?id=${s?.objectID ?? ''}`,
       body: host
     };
   });
   await widget('cards', { items: items.length ? items : [{ title: 'No stories', subtitle: '—' }] });
   ```

5. **Full sortable table** of the 30 stories:
   ```js
   const res = await call('get-front-page', { hitsPerPage: 30 });
   const stories = (res?.hits ?? []).filter(s => s);
   const rows = stories.map(s => {
     let host = 'news.ycombinator.com';
     try { if (s?.url) host = new URL(s.url).hostname; } catch {}
     return [
       s?.title ?? '(untitled)',
       s?.points || 0,
       s?.num_comments || 0,
       s?.author ?? '—',
       host
     ];
   });
   await widget('data-table', {
     columns: ['Title', 'Points', 'Comments', 'Author', 'Domain'],
     rows: rows.length ? rows : [['(no data)', 0, 0, '—', '—']]
   });
   ```

## Examples

### Standard front page snapshot
```js
const res = await call('get-front-page', {});
const stories = (res?.hits ?? []).filter(s => s);
if (stories.length === 0) return widget('text', { content: 'No stories available.' });

const scores = stories.map(s => s?.points || 0).filter(Number.isFinite);
await widget('stat-card', { label: 'Stories', value: Math.max(stories.length, 1), icon: 'list' });
await widget('stat-card', { label: 'Top score', value: Math.max(scores.length > 0 ? Math.max(...scores) : 0, 1), icon: 'flame' });

const items = stories.slice(0, 5).map(s => ({
  title: s?.title ?? '(untitled)',
  subtitle: `${s?.points ?? 0} pts · by ${s?.author ?? '—'}`,
  url: s?.url || `https://news.ycombinator.com/item?id=${s?.objectID ?? ''}`
}));
await widget('cards', { items: items.length ? items : [{ title: 'No stories', subtitle: '—' }] });

const rows = stories.map(s => [s?.title ?? '(untitled)', s?.points ?? 0, s?.num_comments ?? 0, s?.author ?? '—']);
await widget('data-table', {
  columns: ['Title', 'Points', 'Comments', 'Author'],
  rows: rows.length ? rows : [['(no data)', 0, 0, '—']]
});
```

### Extended view (50 stories)
```js
const res = await call('get-front-page', { hitsPerPage: 50 });
const hits = (res?.hits ?? []).filter(s => s);
const rows = hits.map((s, i) => [i + 1, s?.title ?? '(untitled)', s?.points ?? 0, s?.num_comments ?? 0]);
await widget('data-table', {
  columns: ['#', 'Title', 'Points', 'Comments'],
  rows: rows.length ? rows : [[1, '(no data)', 0, 0]]
});
```

## Common mistakes

- **Forgetting Ask HN / Show HN have no `url`**: fall back to `https://news.ycombinator.com/item?id=${objectID}` when `url` is missing
- **Ignoring `objectID`**: this is the HN item id needed to link to the discussion thread, not the story id
- **Not handling `points: null`**: poll items or very recent stories may have null — coerce with `|| 0` before sums
- **Truncating the table to 5 rows**: the table is the drill-down — keep all 30 (or 50) rows so the user can scan beyond the cards
- **Using `created_at` as a Date directly**: it's an ISO string; use `new Date(s.created_at)` if you need to format it
- **Calling `get-front-page` with `hitsPerPage > 100` "to be safe"**: the front page only has ~30 active stories; larger values just pad with older items
