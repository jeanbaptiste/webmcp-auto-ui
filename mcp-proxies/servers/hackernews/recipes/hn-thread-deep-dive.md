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
- "Show me the HN thread 38456789 with comments"
- "What are people saying in this HN discussion?"
- "Open HN item 39123456"
- "Plonge dans le thread HN 38800000"
- "Top comments on HN story 41000000"

The `get-item` tool returns the full nested comment tree — perfect for in-depth exploration.

## How to use

1. **Fetch the item** (story + nested comments):
   ```js
   const item = await call('get-item', { itemId: '38456789' });
   if (!item || item.deleted || item.dead) return widget('text', { content: 'Item unavailable (deleted, dead, or not found).' });
   ```

2. **Flatten the comment tree** with depth tracking:
   ```js
   function flatten(node, depth = 0, acc = []) {
     for (const child of (node?.children ?? [])) {
       if (!child) continue;
       acc.push({ ...child, depth });
       flatten(child, depth + 1, acc);
     }
     return acc;
   }
   const allComments = flatten(item);
   ```

3. **Render KPI stat-cards**:
   ```js
   const depths = allComments.map(c => c?.depth ?? 0).filter(Number.isFinite);
   await widget('stat-card', { label: 'Score', value: item?.points ?? 0, icon: 'arrow-up' });
   await widget('stat-card', { label: 'Comments', value: allComments.length, icon: 'message-circle' });
   await widget('stat-card', { label: 'Max depth', value: depths.length > 0 ? Math.max(0, ...depths) : 0, icon: 'git-branch' });
   await widget('stat-card', { label: 'Author', value: item?.author ?? '—', icon: 'user' });
   ```

4. **Story body** (text widget — render HTML when present):
   ```js
   await widget('text', {
     title: item?.title ?? '(untitled)',
     body: item?.text || (item?.url ? `Link: ${item.url}` : '(no body)'),
     html: !!item?.text
   });
   ```

5. **Top 5 root-level comments by score**:
   ```js
   const topComments = allComments
     .filter(c => c?.depth === 0)
     .sort((a, b) => (b?.points || 0) - (a?.points || 0))
     .slice(0, 5);
   await widget('cards', {
     items: topComments.map(c => {
       let date = '—';
       try {
         const d = new Date(c?.created_at);
         if (Number.isFinite(d.getTime())) date = d.toLocaleDateString();
       } catch {}
       return {
         title: `${c?.author ?? '—'} · ${c?.points ?? 0} pts`,
         subtitle: date,
         body: (c?.text ?? '').replace(/<[^>]+>/g, '').slice(0, 300) + '…'
       };
     })
   });
   ```

6. **Comment distribution by depth**:
   ```js
   const byDepth = {};
   for (const c of allComments) byDepth[c?.depth ?? 0] = (byDepth[c?.depth ?? 0] || 0) + 1;
   await widget('chart-rich', {
     type: 'bar',
     title: 'Comments per depth level',
     data: Object.entries(byDepth)
       .sort(([a], [b]) => +a - +b)
       .map(([d, n]) => ({ label: `Lvl ${d}`, value: n }))
   });
   ```

## Examples

### Standard story drill-down
```js
const item = await call('get-item', { itemId: '38456789' });
if (!item || item.deleted || item.dead) return widget('text', { content: 'Item unavailable.' });
function flatten(n, d = 0, acc = []) {
  for (const c of (n?.children ?? [])) { if (!c) continue; acc.push({ ...c, depth: d }); flatten(c, d + 1, acc); }
  return acc;
}
const comments = flatten(item);

await widget('stat-card', { label: 'Score', value: item?.points ?? 0, icon: 'arrow-up' });
await widget('stat-card', { label: 'Comments', value: comments.length, icon: 'message-circle' });
await widget('text', { title: item?.title ?? '(untitled)', body: item?.text || item?.url || '(no body)', html: !!item?.text });
await widget('cards', {
  items: comments.filter(c => c?.depth === 0).slice(0, 5).map(c => ({
    title: c?.author ?? '—',
    body: (c?.text ?? '').replace(/<[^>]+>/g, '').slice(0, 200)
  }))
});
```

### Poll with options
```js
const poll = await call('get-item', { itemId: '126809' });
if (!poll) return widget('text', { content: 'Poll not found.' });
await widget('text', { title: poll?.title ?? '(untitled)', body: poll?.text ?? '', html: true });
await widget('chart-rich', {
  type: 'bar',
  title: 'Poll options',
  data: (poll?.children ?? []).filter(opt => opt).map(opt => ({ label: opt?.text ?? '?', value: opt?.points ?? 0 }))
});
```

## Common mistakes

- **Forgetting that `text` is HTML**: HN comments contain `<p>`, `<a>`, `<i>` — strip with `.replace(/<[^>]+>/g, '')` for plain previews, or render as HTML in the widget
- **Treating `children` as flat**: it's a nested tree — recursive flattening is required to count or rank globally
- **Using `item.kids`**: that field is the IDs from the raw HN API — `get-item` returns the resolved tree under `children`
- **Long threads block the UI**: thread fetching can take 2-3s for >500 comments; show a stat-card immediately, defer the chart
- **Sorting all comments by score**: only root comments have meaningful relative scores — replies are ranked locally, not globally
- **Showing every comment in cards**: cap at 5-10 root-level highlights; the rest belongs in a collapsible widget if the user asks
