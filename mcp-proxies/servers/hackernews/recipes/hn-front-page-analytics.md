---
id: hn-front-page-analytics
name: HackerNews front page analytics
description: Dashboard analytique de la front page — distribution des scores, top domaines, fréquence horaire.
when: the user asks for analytics, trends, distributions, or aggregated insights on the HN front page
servers: [hackernews]
tools_used: [get-front-page]
data_type: analytics
components_used: [stat-card, chart-rich, table]
layout:
  type: grid
  columns: 2
  arrangement: KPIs at the top, score distribution + top domains charts in the middle, table at the bottom
---

## When to use

The user wants aggregated insights, not a story-by-story read:
- "Analyze trends on the HN front page"
- "What domains dominate Hacker News today?"
- "Score distribution on HN front page"
- "À quelle heure les posts HN sont-ils publiés ?"
- "Average engagement on HN today"

This recipe complements `hn-front-page-overview` by transforming the same 30-story payload into aggregated charts.

## How to use

> Each numbered block below is **self-contained** — it re-fetches the front page so it can run standalone in a recipe runner.

1. **Fetch the front page** (use the max useful sample):
   ```js
   const res = await call('get-front-page', { hitsPerPage: 100 });
   const stories = (res?.hits ?? []).filter(s => s);
   if (stories.length === 0) return widget('text', { content: 'No stories to analyze.' });
   const scalar = v => (v !== null && typeof v === 'object') ? (v.value ?? '') : (v ?? '');
   const num = v => { const n = Number(scalar(v)); return Number.isFinite(n) ? n : 0; };
   const items = stories.slice(0, 5).map(s => ({
     title: scalar(s?.title) || '(untitled)',
     subtitle: `${num(s?.points)} pts · ${num(s?.num_comments)} comments · by ${scalar(s?.author) || '—'}`,
     url: scalar(s?.url) || `https://news.ycombinator.com/item?id=${s?.objectID ?? ''}`
   }));
   await widget('cards', { items: items.length ? items : [{ title: 'No stories', subtitle: '—' }] });
   ```

2. **Compute KPIs**:
   ```js
   const res = await call('get-front-page', { hitsPerPage: 100 });
   const stories = (res?.hits ?? []).filter(s => s);
   const num = v => { const n = Number(typeof v === 'object' && v !== null ? (v.value ?? v) : v); return Number.isFinite(n) ? n : 0; };
   const points = stories.map(s => num(s?.points));
   const comments = stories.map(s => num(s?.num_comments));
   const avgScore = points.length > 0 ? Math.round(points.reduce((s, x) => s + x, 0) / points.length) : 0;
   const avgComments = comments.length > 0 ? Math.round(comments.reduce((s, x) => s + x, 0) / comments.length) : 0;
   const sorted = [...points].sort((a, b) => a - b);
   const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
   await widget('text', { content: `KPIs: avg=${avgScore}, median=${median}, avgComments=${avgComments}` });
   ```

3. **Render KPI stat-cards**:
   ```js
   const res = await call('get-front-page', { hitsPerPage: 100 });
   const stories = (res?.hits ?? []).filter(s => s);
   const num = v => { const n = Number(typeof v === 'object' && v !== null ? (v.value ?? v) : v); return Number.isFinite(n) ? n : 0; };
   const points = stories.map(s => num(s?.points));
   const comments = stories.map(s => num(s?.num_comments));
   const avgScore = points.length > 0 ? Math.round(points.reduce((s, x) => s + x, 0) / points.length) : 0;
   const avgComments = comments.length > 0 ? Math.round(comments.reduce((s, x) => s + x, 0) / comments.length) : 0;
   const sorted = [...points].sort((a, b) => a - b);
   const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
   await widget('stat-card', { label: 'Stories', value: Math.max(stories.length, 1), icon: 'list' });
   await widget('stat-card', { label: 'Avg score', value: Math.max(avgScore, 1), icon: 'arrow-up' });
   await widget('stat-card', { label: 'Median score', value: Math.max(median, 1), icon: 'bar-chart' });
   await widget('stat-card', { label: 'Avg comments', value: Math.max(avgComments, 1), icon: 'message-circle' });
   ```

4. **Score distribution histogram**:
   ```js
   const res = await call('get-front-page', { hitsPerPage: 100 });
   const stories = (res?.hits ?? []).filter(s => s);
   const num = v => { const n = Number(typeof v === 'object' && v !== null ? (v.value ?? v) : v); return Number.isFinite(n) ? n : 0; };
   const buckets = [0, 50, 100, 200, 500, 1000, 5000];
   const counts = buckets.map((b, i) => stories.filter(s => {
     const pts = num(s?.points);
     return pts >= b && (i === buckets.length - 1 || pts < buckets[i + 1]);
   }).length);
   const data = buckets.map((b, i) => ({ label: `${b}+`, value: counts[i] }));
   await widget('chart-rich', {
     type: 'bar',
     title: 'Score distribution',
     data: (data.length && !counts.every(c => c === 0)) ? data : [{ label: '0+', value: 1 }]
   });
   ```

5. **Top domains** (extract hostname, count occurrences):
   ```js
   const res = await call('get-front-page', { hitsPerPage: 100 });
   const stories = (res?.hits ?? []).filter(s => s);
   const scalar = v => (v !== null && typeof v === 'object') ? (v.value ?? '') : (v ?? '');
   const domains = {};
   for (const s of stories) {
     const rawUrl = scalar(s?.url);
     if (!rawUrl) continue;
     try {
       const host = new URL(rawUrl).hostname.replace(/^www\./, '');
       domains[host] = (domains[host] || 0) + 1;
     } catch {}
   }
   const data = Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([host, n]) => ({ label: host, value: n }));
   await widget('chart-rich', {
     type: 'bar',
     title: 'Top domains',
     data: data.length ? data : [{ label: 'news.ycombinator.com', value: 1 }]
   });
   ```

6. **Hourly publication frequency**:
   ```js
   const res = await call('get-front-page', { hitsPerPage: 100 });
   const stories = (res?.hits ?? []).filter(s => s);
   const scalar = v => (v !== null && typeof v === 'object') ? (v.value ?? '') : (v ?? '');
   const hours = Array(24).fill(0);
   for (const s of stories) {
     const ts = scalar(s?.created_at);
     if (!ts) continue;
     const d = new Date(ts);
     if (!Number.isFinite(d.getTime())) continue;
     hours[d.getUTCHours()]++;
   }
   const data = hours.map((n, h) => ({ label: `${h}h`, value: n }));
   await widget('chart-rich', {
     type: 'line',
     title: 'Publications by hour (UTC)',
     data: (data.length && !hours.every(h => h === 0)) ? data : [{ label: '0h', value: 1 }]
   });
   ```

7. **Top 10 stories by points**:
   ```js
   const res = await call('get-front-page', { hitsPerPage: 100 });
   const stories = (res?.hits ?? []).filter(s => s);
   const scalar = v => (v !== null && typeof v === 'object') ? (v.value ?? '') : (v ?? '');
   const num = v => { const n = Number(scalar(v)); return Number.isFinite(n) ? n : 0; };
   const rows = [...stories].sort((a, b) => num(b?.points) - num(a?.points)).slice(0, 10).map((s, i) => {
     let host = 'HN';
     try { const rawUrl = scalar(s?.url); if (rawUrl) host = new URL(rawUrl).hostname.replace(/^www\./, ''); } catch {}
     return [i + 1, scalar(s?.title) || '(untitled)', num(s?.points), num(s?.num_comments), host];
   });
   await widget('data-table', {
     columns: ['Rank', 'Title', 'Points', 'Comments', 'Domain'],
     rows: rows.length ? rows : [[1, '(no data)', 0, 0, '—']]
   });
   ```

## Examples

### Full analytics on 100-story sample
```js
const res = await call('get-front-page', { hitsPerPage: 100 });
const stories = (res?.hits ?? []).filter(s => s);
if (stories.length === 0) return widget('text', { content: 'No data.' });
const points = stories.map(s => s?.points || 0).filter(Number.isFinite);
const avg = points.length > 0 ? Math.round(points.reduce((s, x) => s + x, 0) / points.length) : 0;
await widget('stat-card', { label: 'Avg score', value: Math.max(avg, 1), icon: 'arrow-up' });

const domains = {};
stories.forEach(s => {
  if (!s?.url) return;
  try { const h = new URL(s.url).hostname.replace(/^www\./, ''); domains[h] = (domains[h] || 0) + 1; } catch {}
});
const data = Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h, n]) => ({ label: h, value: n }));
await widget('chart-rich', {
  type: 'bar',
  title: 'Top domains',
  data: data.length ? data : [{ label: 'news.ycombinator.com', value: 1 }]
});
```

### Engagement ratio (comments per point)
```js
const res = await call('get-front-page', { hitsPerPage: 30 });
const hits = (res?.hits ?? []).filter(s => s);
const rows = hits.map(s => {
  const pts = s?.points ?? 0;
  const com = s?.num_comments ?? 0;
  const ratio = (com / Math.max(pts, 1)).toFixed(2);
  return [s?.title ?? '(untitled)', pts, com, ratio];
});
await widget('data-table', {
  columns: ['Title', 'Points', 'Comments', 'C/P ratio'],
  rows: rows.length ? rows : [['(no data)', 0, 0, '0.00']]
});
```

## Common mistakes

- **Computing averages on a 30-story sample**: too noisy — request `hitsPerPage: 100` for stable distributions
- **`new URL(s.url)` on `null`**: Ask HN / Show HN posts have no url — guard with `if (!s.url) continue`
- **Using local hours instead of UTC**: HN serves a global audience — `getUTCHours()` is the correct axis
- **Bucket boundaries off-by-one**: ensure the last bucket is open-ended (`>= 5000`) so high-score stories aren't dropped
- **Forgetting `www.` normalization**: `www.github.com` and `github.com` should be merged into one domain bucket
- **Treating `points` as a percent or score out of 100**: it's an unbounded upvote count — scale charts logarithmically if values span orders of magnitude
