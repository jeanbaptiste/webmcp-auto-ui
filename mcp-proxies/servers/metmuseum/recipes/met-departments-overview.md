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
   const resp = await call('list-departments', {}).catch(() => null);
   const departments = resp?.departments ?? [];
   if (departments.length === 0) await widget('text', { content: 'No departments returned.' });
   ```

2. **For each department, fetch a `total` and a signature-piece ID**:
   ```js
   const stats = await Promise.all(departments.map(async d => { const res = await call('search-museum-objects', { q: '*', departmentId: d?.departmentId, isHighlight: true, hasImages: true, pageSize: 1 }).catch(() => null); return { ...d, total: res?.total ?? 0, sampleId: (res?.objectIDs ?? [])[0] }; }));
   ```

3. **Stats**:
   ```js
   const totalObjects = stats.reduce((s, d) => s + (d?.total ?? 0), 0);
   await widget('stat-card', { label: 'Departments', value: stats.length, icon: 'building' });
   await widget('stat-card', { label: 'Highlight objects', value: totalObjects, icon: 'archive' });
   ```

4. **Chart of volume per department**:
   ```js
   // Use short names (≤20 chars) to avoid overflow; full names appear in the KV below.
   await widget('chart', {
     title: 'Highlight objects per department',
     bars: stats.map(d => {
       const name = (d?.displayName ?? '—').replace(/^The /, '').slice(0, 22);
       return [name, d?.total ?? 0];
     })
   });
   ```

5. **Cards with a signature piece per department**:
   ```js
   const sampled = stats.filter(d => d?.sampleId);
   const samples = await Promise.all(sampled.map(d => call('get-museum-object', { objectId: d.sampleId }).catch(() => null)));
   const cardItems = samples
     .map((s, i) => {
       const deptName = sampled[i]?.displayName;
       const objTitle = s?.object?.title;
       const objDate  = s?.object?.objectDate;
       // Skip cards where both dept name and object title are missing
       if (!deptName && !objTitle) return null;
       return {
         title: deptName || objTitle || 'Unknown department',
         subtitle: objTitle && objTitle !== deptName ? objTitle : undefined,
         description: objDate || undefined,
         tags: objDate ? [objDate] : undefined
       };
     })
     .filter(Boolean);
   if (cardItems.length > 0) {
     await widget('cards', { title: 'Signature pieces by department', cards: cardItems });
   } else {
     await widget('text', { content: 'No signature pieces available for these departments.' });
   }
   ```

6. **KV directory**:
   ```js
   await widget('kv', { title: 'Departments', rows: stats.map(d => [d?.displayName ?? '—', `${d?.total ?? 0} highlights`]) });
   ```

## Examples

### Full overview
```js
const resp = await call('list-departments', {}).catch(() => null);
const departments = resp?.departments ?? [];
const stats = await Promise.all(departments.map(async d => { const res = await call('search-museum-objects', { q: '*', departmentId: d?.departmentId, isHighlight: true, pageSize: 1 }).catch(() => null); return { ...d, total: res?.total ?? 0 }; }));
await widget('chart', { title: 'Highlight objects per department', bars: stats.map(d => [(d?.displayName ?? '—').replace(/^The /, '').slice(0, 22), d?.total ?? 0]) });
await widget('kv', { title: 'Departments', rows: stats.map(d => [d?.displayName ?? '—', `${d?.total ?? 0}`]) });
```

### Pick a department to dive into
```js
const resp = await call('list-departments', {}).catch(() => null);
const departments = resp?.departments ?? [];
await widget('cards', { cards: departments.map(d => ({ title: d?.displayName ?? '—', description: `Department #${d?.departmentId ?? '—'}` })) });
```

## Common mistakes

- **No `q` parameter**: `search-museum-objects` requires `q` — always pass `q: '*'` even for a faceted count
- **Fetching every object**: 19 departments × full gallery would explode the budget — `pageSize: 1` per department is enough for the count
- **Mixing highlight and total**: `isHighlight: true` returns highlight count only — drop the flag if you want raw totals
- **Missing sample image**: not every highlight has `primaryImageSmall` — fall back to a placeholder card if the image is missing
- **Long department names overflowing the chart**: use abbreviations in the chart label and full names in the KV
