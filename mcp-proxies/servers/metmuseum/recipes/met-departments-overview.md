---
id: met-departments-overview
name: Dashboard of all Met departments with volume and signature pieces
description: KV of departments + chart of object counts + cards with one signature object per department + global stats
when: the user asks for the structure of the Met or where to start exploring
servers: [metmuseum]
tools_used: [list-departments, search-museum-objects, get-museum-object]
data_type: méta-catalogue
components_used: [kv, chart, cards, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: stats at top, chart on a row, cards + kv at the bottom
---

## When to use

- "What are the departments at the Met?"
- "Overview of the Met collection"
- "Where do I start at the Met?"
- "Map of the museum's departments"

## How to use

1. **List all departments**:
   ```js
   const { departments } = await call('list-departments', {});
   ```

2. **For each department, fetch a `total` and a signature-piece ID**:
   ```js
   const stats = await Promise.all(departments.map(async d => {
     const r = await call('search-museum-objects', {
       q: '*', departmentId: d.departmentId, isHighlight: true, hasImages: true, pageSize: 1
     });
     return { ...d, total: r.total, sampleId: r.objectIDs[0] };
   }));
   ```

3. **Stats**:
   ```js
   const totalObjects = stats.reduce((s, d) => s + d.total, 0);
   await widget('stat-card', { label: 'Departments', value: stats.length, icon: 'building' });
   await widget('stat-card', { label: 'Highlight objects', value: totalObjects, icon: 'archive' });
   ```

4. **Chart of volume per department**:
   ```js
   await widget('chart', {
     type: 'bar',
     data: stats.map(d => ({ label: d.displayName, value: d.total }))
   });
   ```

5. **Cards with a signature piece per department**:
   ```js
   const samples = await Promise.all(stats.filter(d => d.sampleId).map(d => call('get-museum-object', { objectId: d.sampleId })));
   await widget('cards', {
     items: samples.map((s, i) => ({
       title: stats[i].displayName,
       subtitle: s.object.title,
       image: s.object.primaryImageSmall,
       body: `${s.object.objectDate || '—'}`
     }))
   });
   ```

6. **KV directory**:
   ```js
   await widget('kv', { pairs: stats.map(d => [d.displayName, `${d.total} highlights`]) });
   ```

## Examples

### Full overview
```js
const { departments } = await call('list-departments', {});
const stats = await Promise.all(departments.map(async d => {
  const r = await call('search-museum-objects', { q: '*', departmentId: d.departmentId, isHighlight: true, pageSize: 1 });
  return { ...d, total: r.total };
}));
await widget('chart', { type: 'bar', data: stats.map(d => ({ label: d.displayName, value: d.total })) });
await widget('kv', { pairs: stats.map(d => [d.displayName, `${d.total}`]) });
```

### Pick a department to dive into
```js
const { departments } = await call('list-departments', {});
await widget('cards', { items: departments.map(d => ({ title: d.displayName, body: `Department #${d.departmentId}` })) });
```

## Common mistakes

- **No `q` parameter**: `search-museum-objects` requires `q` — always pass `q: '*'` even for a faceted count
- **Fetching every object**: 19 departments × full gallery would explode the budget — `pageSize: 1` per department is enough for the count
- **Mixing highlight and total**: `isHighlight: true` returns highlight count only — drop the flag if you want raw totals
- **Missing sample image**: not every highlight has `primaryImageSmall` — fall back to a placeholder card if the image is missing
- **Long department names overflowing the chart**: use abbreviations in the chart label and full names in the KV
