---
id: met-classification-deep-dive
name: Drill down into the classification taxonomy of a department
description: Rich chart of classifications + per-class gallery + cards + KV taxonomy
when: the user wants to understand sub-categories inside a department (Drawings vs Prints vs Photographs, types of armor)
servers: [metmuseum]
tools_used: [list-departments, search-museum-objects, get-museum-object]
data_type: sous-classification
components_used: [chart-rich, gallery, cards, kv]
ce: [auto-notebook, auto-text, auto-chart, auto-gallery, auto-cards, auto-kv]
layout:
  type: grid
  columns: 2
  arrangement: chart-rich at top, gallery on a row, cards + kv at the bottom
---

## When to use

- "Difference between Drawings, Prints, and Photographs"
- "All types of ceramics"
- "Categories within Arms and Armor"
- "Sub-classifications of Greek pottery"

## How to use

1. **Find the right department** via `list-departments`:
   ```js
   const resp = await call('list-departments', {}).catch(() => null);
   const departments = resp?.departments ?? [];
   const dept = departments.find(d => d?.displayName?.includes('Drawings'));
   if (!dept) await widget('text', { content: 'Department not found.' });
   ```

2. **Search broadly inside the department**:
   ```js
   const search = await call('search-museum-objects', {
     q: '*',
     departmentId: dept.departmentId,
     hasImages: true,
     pageSize: 50
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No objects found.' });
   ```

3. **Fetch a sample and group by `classification`**:
   ```js
   const objs = await Promise.all(ids.slice(0, 30).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const works = objs.filter(o => o?.object).map(o => o.object);
   const byClass = works.reduce((acc, w) => { const cls = w?.classification || 'Uncategorized'; (acc[cls] = acc[cls] || []).push(w); return acc; }, {});
   ```

4. **Rich chart of classifications**:
   ```js
   await widget('chart-rich', {
     type: 'bar',
     data: Object.entries(byClass).map(([k, ws]) => ({ label: k, value: ws.length, sample: ws[0]?.primaryImageSmall }))
   });
   ```

5. **Gallery + cards per classification**:
   ```js
   await widget('gallery', {
     images: Object.values(byClass).flatMap(ws => ws.slice(0, 1)).filter(w => w?.primaryImageSmall).map(w => ({ src: w.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.classification ?? '—' }))
   });
   await widget('cards', {
     items: Object.entries(byClass).map(([k, ws]) => ({ title: k, subtitle: `${ws.length} objects`, image: ws[0]?.primaryImageSmall, body: ws[0]?.title ?? '—' }))
   });
   ```

6. **KV taxonomy explanation**:
   ```js
   await widget('kv', {
     rows: Object.entries(byClass).map(([k, ws]) => [k, `${ws.length} objects — ex. ${ws[0]?.title ?? '—'}`])
   });
   ```

## Examples

### Drawings & Prints department
```js
const dResp = await call('list-departments', {}).catch(() => null);
const departments = dResp?.departments ?? [];
const d = departments.find(x => x?.displayName?.includes('Drawings'));
if (!d) await widget('text', { content: 'Department not found.' });
const r = await call('search-museum-objects', { q: '*', departmentId: d.departmentId, hasImages: true, pageSize: 50 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 25).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const grouped = objs.filter(o => o?.object).reduce((acc, o) => { const cls = o.object?.classification || 'Uncategorized'; (acc[cls] = acc[cls] || []).push(o.object); return acc; }, {});
await widget('chart-rich', { type: 'bar', data: Object.entries(grouped).map(([k, v]) => ({ label: k, value: v.length })) });
```

### Greek classifications
```js
const r = await call('search-museum-objects', { q: '*', departmentId: 13, hasImages: true, pageSize: 30 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 20).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object);
await widget('cards', { items: works.slice(0, 5).map(w => ({ title: w?.classification ?? '—', subtitle: w?.title ?? '(untitled)', image: w?.primaryImageSmall })) });
```

## Common mistakes

- **Trusting `classification` to always be filled**: roughly 5% of records have null — bucket them under "Uncategorized"
- **Confusing `classification` with `objectName`**: similar but distinct — `classification` is curatorial taxonomy, `objectName` is descriptive
- **Sampling too small**: with 5 objects you'll only see 1-2 classifications — sample 25-30 for any signal
- **Forgetting the chart legend with sample image**: `chart-rich` shines when each bar carries a thumbnail — pass `sample` (image URL)
- **One classification per query**: the goal is to see the distribution — never filter on classification at search time
