---
id: hn-thread-deep-dive
name: HackerNews thread deep dive
description: Plongée dans un thread HN — KPIs, corps de la story, top commentaires, distribution par profondeur.
when: the user asks to explore, dive into, or read a specific HN thread or discussion by id
servers: [hackernews]
tools_used: [get-item]
data_type: thread
components_used: [stat-card, cards, text, chart-rich]
layout:
  type: grid
  columns: 2
  arrangement: KPIs row, story body full-width, top comments cards, depth chart
---

## When to use

The user wants to dive into a specific HN discussion:
- "Show me the HN thread 38309611 with comments"
- "What are people saying in this HN discussion?"
- "Open HN item 41002195"
- "Plonge dans le thread HN 38309611"
- "Top comments on HN story 11116274"

The `get-item` tool returns the full nested comment tree — perfect for in-depth exploration. Pick a story id with a meaningful comment count (e.g. `38309611` "OpenAI fires Sam Altman" — 2,500+ comments — for a stable demo).

## How to use

> Each numbered block below is **self-contained** — it re-fetches the item so it can run standalone in a recipe runner. Default item id below: `38309611` (a famous, comment-rich, stable thread).

1. **Fetch the item** (story + nested comments):
   ```js
   const item = await call('get-item', { itemId: '38309611' });
   if (!item || item.deleted || item.dead) return widget('text', { content: 'Item unavailable (deleted, dead, or not found).' });
   const _body1 = item?.text || (item?.url ? `Link: ${item.url}` : '(no body)');
   await widget('text', { content: `**${item?.title ?? '(untitled)'}**\n\n${_body1}` });
   ```

2. **Flatten the comment tree** with depth tracking:
   ```js
   const item = await call('get-item', { itemId: '38309611' });
   function flatten(node, depth = 0, acc = []) {
     for (const child of (node?.children ?? [])) {
       if (!child) continue;
       acc.push({ ...child, depth });
       flatten(child, depth + 1, acc);
     }
     return acc;
   }
   const allComments = flatten(item);
   await widget('text', { content: `Loaded ${allComments.length} comments, max depth ${allComments.length ? Math.max(...allComments.map(c => c?.depth ?? 0)) : 0}.` });
   ```

3. **Render KPI stat-cards**:
   ```js
   const item = await call('get-item', { itemId: '38309611' });
   function flatten(node, depth = 0, acc = []) {
     for (const child of (node?.children ?? [])) {
       if (!child) continue;
       acc.push({ ...child, depth });
       flatten(child, depth + 1, acc);
     }
     return acc;
   }
   const allComments = flatten(item);
   const depths = allComments.map(c => c?.depth ?? 0).filter(Number.isFinite);
   await widget('stat-card', { label: 'Score', value: Math.max(item?.points ?? 0, 1), icon: 'arrow-up' });
   await widget('stat-card', { label: 'Comments', value: Math.max(allComments.length, 1), icon: 'message-circle' });
   await widget('stat-card', { label: 'Max depth', value: Math.max(depths.length > 0 ? Math.max(0, ...depths) : 0, 1), icon: 'git-branch' });
   await widget('stat-card', { label: 'Author', value: item?.author ?? '—', icon: 'user' });
   ```

4. **Story body** (text widget — render HTML when present):
   ```js
   const item = await call('get-item', { itemId: '38309611' });
   const _body4 = item?.text || (item?.url ? `Link: ${item.url}` : '(no body)');
   await widget('text', { content: `**${item?.title ?? '(untitled)'}**\n\n${_body4}` });
   ```

5. **Top 5 root-level comments** (root-level = direct children of the item):
   ```js
   const item = await call('get-item', { itemId: '38309611' });
   function flatten(node, depth = 0, acc = []) {
     for (const child of (node?.children ?? [])) {
       if (!child) continue;
       acc.push({ ...child, depth });
       flatten(child, depth + 1, acc);
     }
     return acc;
   }
   const allComments = flatten(item);
   const roots = allComments.filter(c => c?.depth === 0).slice(0, 5);
   const cards = roots.map(c => {
     const date = c?.created_at_i ? new Date(c.created_at_i * 1000).toLocaleDateString() : (c?.created_at ?? '—');
     return {
       title: `${c?.author ?? '—'} · ${c?.points ?? 0} pts`,
       subtitle: date,
       body: ((c?.text ?? '').replace(/<[^>]+>/g, '').slice(0, 300) + '…')
     };
   });
   await widget('cards', { cards: cards.length ? cards : [{ title: 'No comments', subtitle: '—' }] });
   ```

6. **Comment distribution by depth**:
   ```js
   const item = await call('get-item', { itemId: '38309611' });
   function flatten(node, depth = 0, acc = []) {
     for (const child of (node?.children ?? [])) {
       if (!child) continue;
       acc.push({ ...child, depth });
       flatten(child, depth + 1, acc);
     }
     return acc;
   }
   const allComments = flatten(item);
   const byDepth = {};
   for (const c of allComments) byDepth[c?.depth ?? 0] = (byDepth[c?.depth ?? 0] || 0) + 1;
   const sortedDepths = Object.keys(byDepth).sort((a, b) => +a - +b);
   const data = sortedDepths.map(d => ({ label: `Lvl ${d}`, values: [byDepth[d]] }));
   await widget('chart-rich', {
     type: 'bar',
     title: 'Comments per depth level',
     labels: sortedDepths.map(d => `Lvl ${d}`),
     data: data.length ? data : [{ label: 'Lvl 0', values: [1] }]
   });
   ```

## Examples

### Standard story drill-down
```js
const item = await call('get-item', { itemId: '38309611' });
if (!item || item.deleted || item.dead) return widget('text', { content: 'Item unavailable.' });
function flatten(n, d = 0, acc = []) {
  for (const c of (n?.children ?? [])) { if (!c) continue; acc.push({ ...c, depth: d }); flatten(c, d + 1, acc); }
  return acc;
}
const comments = flatten(item);

await widget('stat-card', { label: 'Score', value: Math.max(item?.points ?? 0, 1), icon: 'arrow-up' });
await widget('stat-card', { label: 'Comments', value: Math.max(comments.length, 1), icon: 'message-circle' });
const _bodyEx = item?.text || item?.url || '(no body)';
await widget('text', { content: `**${item?.title ?? '(untitled)'}**\n\n${_bodyEx}` });
const cards = comments.filter(c => c?.depth === 0).slice(0, 5).map(c => ({
  title: c?.author ?? '—',
  body: (c?.text ?? '').replace(/<[^>]+>/g, '').slice(0, 200)
}));
await widget('cards', { cards: cards.length ? cards : [{ title: 'No comments', body: '—' }] });
```

### Drill-down on the CrowdStrike outage thread
```js
const item = await call('get-item', { itemId: '41002195' });
if (!item) return widget('text', { content: 'Thread unavailable.' });
function flatten(n, d = 0, acc = []) { for (const c of (n?.children ?? [])) { if (!c) continue; acc.push({ ...c, depth: d }); flatten(c, d + 1, acc); } return acc; }
const all = flatten(item);
const byDepth = {};
for (const c of all) byDepth[c?.depth ?? 0] = (byDepth[c?.depth ?? 0] || 0) + 1;
const sortedDepths = Object.keys(byDepth).sort((a, b) => +a - +b);
const data = sortedDepths.map(d => ({ label: `Lvl ${d}`, values: [byDepth[d]] }));
await widget('chart-rich', {
  type: 'bar',
  title: 'CrowdStrike thread depth',
  labels: sortedDepths.map(d => `Lvl ${d}`),
  data: data.length ? data : [{ label: 'Lvl 0', values: [1] }]
});
```

## Common mistakes

- **Forgetting that `text` is HTML**: HN comments contain `<p>`, `<a>`, `<i>` — strip with `.replace(/<[^>]+>/g, '')` for plain previews, or render as HTML in the widget
- **Treating `children` as flat**: it's a nested tree — recursive flattening is required to count or rank globally
- **Using `item.kids`**: that field is the IDs from the raw HN API — `get-item` returns the resolved tree under `children`
- **Long threads block the UI**: thread fetching can take 2-3s for >500 comments; show a stat-card immediately, defer the chart
- **Sorting all comments by score**: the bridge does not surface comment `points` reliably (often `null`) — rank by recency or top-level position instead
- **Picking obscure or recent thread ids**: brand-new threads have no resolved children yet, and obscure ids may have 0 comments — prefer well-known historical threads (`38309611`, `41002195`, `11116274`) for stable demos
- **Showing every comment in cards**: cap at 5-10 root-level highlights; the rest belongs in a collapsible widget if the user asks
