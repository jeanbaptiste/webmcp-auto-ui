---
id: hn-keyword-monitor
name: HackerNews keyword monitor
description: Veille technologique sur un mot-clé — volume, top posts, breakdown par tag.
when: the user asks to monitor, watch, or track posts about a specific keyword or technology on HN
servers: [hackernews]
tools_used: [search-posts]
data_type: search
components_used: [stat-card, chart-rich, cards, table]
layout:
  type: grid
  columns: 2
  arrangement: KPIs at top, volume timeline + tag breakdown side-by-side, top cards, full table
---

## When to use

The user wants to track a single topic across HackerNews:
- "Monitor HN posts about Rust with at least 50 points"
- "What's being said about WebAssembly on HackerNews?"
- "Track 'LLM' posts on HN this year"
- "Surveille les posts HN qui parlent de Kubernetes"
- "Show me popular Show HN posts about databases"

The `search-posts` tool supports keyword + tags + numeric filters, perfect for filtered watchlists.

## How to use

1. **Search posts matching the keyword** with a quality threshold:
   ```js
   const res = await call('search-posts', {
     query: 'Rust',
     numericFilters: ['points>=50'],
     hitsPerPage: 100
   });
   const posts = (res?.hits ?? []).filter(p => p);
   if (posts.length === 0) return widget('text', { content: 'No posts match your query.' });
   ```

2. **Compute KPIs**:
   ```js
   const totalPoints = posts.reduce((s, x) => s + (x?.points || 0), 0);
   const totalComments = posts.reduce((s, x) => s + (x?.num_comments || 0), 0);
   const avgScore = Math.round(totalPoints / Math.max(posts.length, 1));
   ```

3. **Stat-cards**:
   ```js
   await widget('stat-card', { label: 'Posts', value: posts.length, icon: 'search' });
   await widget('stat-card', { label: 'Avg score', value: avgScore, icon: 'arrow-up' });
   await widget('stat-card', { label: 'Total comments', value: totalComments, icon: 'message-circle' });
   ```

4. **Volume over time** (group by month):
   ```js
   const months = {};
   for (const p of posts) {
     const m = p?.created_at?.slice(0, 7); // "YYYY-MM"
     if (!m) continue;
     months[m] = (months[m] || 0) + 1;
   }
   await widget('chart-rich', {
     type: 'line',
     title: 'Posts per month',
     data: Object.entries(months).sort().map(([m, n]) => ({ label: m, value: n }))
   });
   ```

5. **Tag breakdown** (story / show_hn / ask_hn / comment):
   ```js
   const tagCounts = { story: 0, show_hn: 0, ask_hn: 0, comment: 0 };
   for (const p of posts) {
     for (const t of (p?._tags ?? [])) if (t in tagCounts) tagCounts[t]++;
   }
   await widget('chart-rich', {
     type: 'bar',
     title: 'By type',
     data: Object.entries(tagCounts).map(([k, v]) => ({ label: k, value: v }))
   });
   ```

6. **Top 5 posts in cards**:
   ```js
   await widget('cards', {
     items: [...posts].sort((a, b) => (b?.points ?? 0) - (a?.points ?? 0)).slice(0, 5).map(p => ({
       title: p?.title || p?.story_title || '(comment)',
       subtitle: `${p?.points ?? 0} pts · ${p?.num_comments ?? 0} comments · ${p?.author ?? '—'}`,
       url: p?.url || `https://news.ycombinator.com/item?id=${p?.objectID ?? ''}`
     }))
   });
   ```

7. **Full results table**:
   ```js
   await widget('table', {
     columns: ['Title', 'Points', 'Comments', 'Author', 'Date'],
     rows: posts.map(p => [
       p?.title || p?.story_title || '(comment)',
       p?.points ?? 0,
       p?.num_comments ?? 0,
       p?.author ?? '—',
       p?.created_at?.slice(0, 10) ?? '—'
     ])
   });
   ```

## Examples

### Rust posts with high engagement
```js
const res = await call('search-posts', {
  query: 'Rust',
  tags: ['story'],
  numericFilters: ['points>=100'],
  hitsPerPage: 100
});
const hits = (res?.hits ?? []).filter(p => p);
await widget('stat-card', { label: 'Rust stories', value: hits.length, icon: 'search' });
await widget('cards', {
  items: hits.filter(p => p?.url).slice(0, 5).map(p => ({ title: p?.title ?? '(untitled)', subtitle: `${p?.points ?? 0} pts`, url: p.url }))
});
```

### Show HN posts about AI
```js
const res = await call('search-posts', {
  query: 'AI',
  tags: ['show_hn'],
  numericFilters: ['points>=20'],
  hitsPerPage: 50
});
const hits = (res?.hits ?? []).filter(p => p);
await widget('table', {
  columns: ['Project', 'Points', 'Comments', 'Author'],
  rows: hits.map(p => [p?.title ?? '(untitled)', p?.points ?? 0, p?.num_comments ?? 0, p?.author ?? '—'])
});
```

## Common mistakes

- **Forgetting numeric filters**: without `points>=N`, low-quality noise drowns the signal — use 20-50 as a baseline
- **Using `tags: ['story', 'show_hn']` expecting OR**: this is AND — use `['(story,show_hn)']` for OR logic
- **Reading `p.title` on comments**: comments have `story_title` (parent story) and a `comment_text` field — fall back chain `title || story_title || '(comment)'`
- **Ignoring `_tags`**: the array contains all applicable tags including `story`, `comment`, `front_page`, `author_xyz` — useful for breakdowns
- **Querying with empty `query`**: passing `query: ''` is allowed but slow on broad tag-only filters — prefer at least one keyword
- **Plotting `created_at_i` as a Date**: it's a Unix timestamp in seconds — multiply by 1000 if you build a `Date` from it
