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

1. **Fetch the front page** (use the max useful sample):
   ```js
   const res = await call('get-front-page', { hitsPerPage: 100 });
   const stories = res.hits;
   ```

2. **Compute KPIs**:
   ```js
   const avgScore = Math.round(stories.reduce((s, x) => s + x.points, 0) / stories.length);
   const avgComments = Math.round(stories.reduce((s, x) => s + x.num_comments, 0) / stories.length);
   const median = [...stories].map(s => s.points).sort((a, b) => a - b)[Math.floor(stories.length / 2)];
   ```

3. **Render KPI stat-cards**:
   ```js
   await widget('stat-card', { label: 'Stories', value: stories.length, icon: 'list' });
   await widget('stat-card', { label: 'Avg score', value: avgScore, icon: 'arrow-up' });
   await widget('stat-card', { label: 'Median score', value: median, icon: 'bar-chart' });
   await widget('stat-card', { label: 'Avg comments', value: avgComments, icon: 'message-circle' });
   ```

4. **Score distribution histogram**:
   ```js
   const buckets = [0, 50, 100, 200, 500, 1000, 5000];
   const counts = buckets.map((b, i) => stories.filter(s =>
     s.points >= b && (i === buckets.length - 1 || s.points < buckets[i + 1])
   ).length);
   await widget('chart-rich', {
     type: 'bar',
     title: 'Score distribution',
     data: buckets.map((b, i) => ({ label: `${b}+`, value: counts[i] }))
   });
   ```

5. **Top domains** (extract hostname, count occurrences):
   ```js
   const domains = {};
   for (const s of stories) {
     if (!s.url) continue;
     const host = new URL(s.url).hostname.replace(/^www\./, '');
     domains[host] = (domains[host] || 0) + 1;
   }
   const topDomains = Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 10);
   await widget('chart-rich', {
     type: 'bar',
     title: 'Top domains',
     data: topDomains.map(([host, n]) => ({ label: host, value: n }))
   });
   ```

6. **Hourly publication frequency**:
   ```js
   const hours = Array(24).fill(0);
   for (const s of stories) hours[new Date(s.created_at).getUTCHours()]++;
   await widget('chart-rich', {
     type: 'line',
     title: 'Publications by hour (UTC)',
     data: hours.map((n, h) => ({ label: `${h}h`, value: n }))
   });
   ```

7. **Top 10 stories by points**:
   ```js
   await widget('table', {
     columns: ['Rank', 'Title', 'Points', 'Comments', 'Domain'],
     rows: [...stories].sort((a, b) => b.points - a.points).slice(0, 10).map((s, i) => [
       i + 1, s.title, s.points, s.num_comments,
       s.url ? new URL(s.url).hostname.replace(/^www\./, '') : 'HN'
     ])
   });
   ```

## Examples

### Full analytics on 100-story sample
```js
const { hits: stories } = await call('get-front-page', { hitsPerPage: 100 });
const avg = Math.round(stories.reduce((s, x) => s + x.points, 0) / stories.length);
await widget('stat-card', { label: 'Avg score', value: avg, icon: 'arrow-up' });

const domains = {};
stories.forEach(s => { if (s.url) { const h = new URL(s.url).hostname.replace(/^www\./, ''); domains[h] = (domains[h] || 0) + 1; } });
await widget('chart-rich', {
  type: 'bar',
  title: 'Top domains',
  data: Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h, n]) => ({ label: h, value: n }))
});
```

### Engagement ratio (comments per point)
```js
const { hits } = await call('get-front-page', { hitsPerPage: 30 });
await widget('table', {
  columns: ['Title', 'Points', 'Comments', 'C/P ratio'],
  rows: hits.map(s => [s.title, s.points, s.num_comments, (s.num_comments / Math.max(s.points, 1)).toFixed(2)])
});
```

## Common mistakes

- **Computing averages on a 30-story sample**: too noisy — request `hitsPerPage: 100` for stable distributions
- **`new URL(s.url)` on `null`**: Ask HN / Show HN posts have no url — guard with `if (!s.url) continue`
- **Using local hours instead of UTC**: HN serves a global audience — `getUTCHours()` is the correct axis
- **Bucket boundaries off-by-one**: ensure the last bucket is open-ended (`>= 5000`) so high-score stories aren't dropped
- **Forgetting `www.` normalization**: `www.github.com` and `github.com` should be merged into one domain bucket
- **Treating `points` as a percent or score out of 100**: it's an unbounded upvote count — scale charts logarithmically if values span orders of magnitude
