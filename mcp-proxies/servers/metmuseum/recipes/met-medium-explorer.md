---
id: met-medium-explorer
name: Explore the distribution of media inside a Met department
description: Rich chart of media + per-medium gallery + detail cards + taxonomy KV
when: the user wants to compare materials/techniques in a department (sculpture vs painting, all media in Islamic art)
servers: [metmuseum]
tools_used: [list-departments, search-museum-objects, get-museum-object]
data_type: analytique
components_used: [chart-rich, gallery, cards, kv]
layout:
  type: grid
  columns: 2
  arrangement: chart-rich at top, gallery on the right, cards + kv at the bottom
---

## When to use

- "Compare Greek sculptures vs Greek vase paintings"
- "What media are in the Islamic Art department?"
- "Techniques used for Japanese prints"
- "All materials in Arms and Armor"

## How to use

1. **Resolve the department** via `list-departments`:
   ```js
   const { departments } = await call('list-departments', {});
   const dept = departments.find(d => d.displayName.includes('Greek'));
   ```

2. **Run one search per medium** of interest:
   ```js
   const media = ['Terracotta', 'Marble', 'Bronze', 'Limestone'];
   const counts = await Promise.all(media.map(async m => {
     const r = await call('search-museum-objects', { q: '*', departmentId: dept.departmentId, medium: m, pageSize: 1 });
     return { medium: m, total: r.total, sampleId: r.objectIDs[0] };
   }));
   ```

3. **Rich chart** with one annotated example per medium:
   ```js
   await widget('chart-rich', {
     type: 'bar',
     data: counts.map(c => ({ label: c.medium, value: c.total, sampleId: c.sampleId }))
   });
   ```

4. **Per-medium examples**:
   ```js
   const examples = await Promise.all(counts.map(c => call('get-museum-object', { objectId: c.sampleId })));
   const items = examples.map(e => e.object);
   await widget('gallery', { images: items.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: w.medium })) });
   ```

5. **Detail cards** with dimensions:
   ```js
   await widget('cards', {
     items: items.map(w => ({ title: w.title, subtitle: w.medium, image: w.primaryImageSmall, body: w.dimensions }))
   });
   ```

6. **KV taxonomy**:
   ```js
   await widget('kv', { pairs: counts.map(c => [c.medium, `${c.total} objects`]) });
   ```

## Examples

### Greek/Roman department
```js
const { departments } = await call('list-departments', {});
const greek = departments.find(d => d.displayName.includes('Greek'));
const media = ['Terracotta', 'Marble', 'Bronze'];
const counts = await Promise.all(media.map(m => call('search-museum-objects', { q: 'sculpture', departmentId: greek.departmentId, medium: m, pageSize: 1 })));
await widget('chart-rich', { type: 'bar', data: media.map((m, i) => ({ label: m, value: counts[i].total })) });
```

### Japanese prints
```js
const r = await call('search-museum-objects', { q: 'print', departmentId: 6, medium: 'Woodblock print', pageSize: 1 });
await widget('kv', { pairs: [['Woodblock print', `${r.total}`]] });
```

## Common mistakes

- **Forgetting the wildcard**: the `q` field is required — pass `q: '*'` (or a generic word) when faceting by `medium`
- **Comparing across departments**: a "marble" count is meaningful in Greek/Roman, irrelevant in Asian — always restrict by `departmentId`
- **One huge fetch**: the goal is the chart, not a detailed table — use `pageSize: 1` per medium just to get `total`
- **Ignoring `mediumExpanded`**: some objects have a richer description — fall back to `medium` only when the expanded form is absent
- **Too many media at once**: 3-5 well-chosen labels make a readable chart; 20 of them is noise
