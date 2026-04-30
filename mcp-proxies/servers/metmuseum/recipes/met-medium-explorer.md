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
   const resp = await call('list-departments', {}).catch(() => null);
   const departments = resp?.departments ?? [];
   const dept = departments.find(d => d?.displayName?.includes('Greek'));
   if (!dept) await widget('text', { content: 'Department not found.' });
   ```

2. **Search broadly then bucket by `medium` post-fetch** (the Met `medium` search filter currently returns 0 — sample widely and group on the returned `medium` field):
   ```js
   const search = await call('search-museum-objects', { q: 'sculpture', departmentId: dept.departmentId, hasImages: true, pageSize: 30 }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   const objs = await Promise.all(ids.slice(0, 12).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const items = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
   const KEYS = ['Terracotta', 'Marble', 'Bronze', 'Limestone'];
   const counts = KEYS.map(k => ({ medium: k, total: items.filter(w => (w?.medium || '').includes(k)).length, sampleId: items.find(w => (w?.medium || '').includes(k))?.objectID }));
   const totalUsed = counts.reduce((s, c) => s + c.total, 0) || items.length;
   ```

3. **Rich chart** with one annotated example per medium:
   ```js
   const chartData = counts.filter(c => c.total > 0).map(c => ({ label: c.medium, value: c.total, sampleId: c.sampleId }));
   await widget('chart-rich', { type: 'bar', data: chartData.length ? chartData : [{ label: 'sample', value: items.length || 1 }] });
   ```

4. **Per-medium examples**:
   ```js
   const examples = items.slice(0, 8);
   const images = examples.map(w => ({ src: w.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.medium ?? '—' }));
   await widget('gallery', { images: images.length ? images : [{ src: '', alt: 'No samples', caption: '—' }] });
   ```

5. **Detail cards** with dimensions:
   ```js
   const cardItems = examples.map(w => ({ title: w?.title ?? '(untitled)', subtitle: w?.medium ?? '—', image: w?.primaryImageSmall, body: w?.dimensions ?? '—' }));
   await widget('cards', { items: cardItems.length ? cardItems : [{ title: 'No samples', subtitle: '—' }] });
   ```

6. **KV taxonomy**:
   ```js
   await widget('kv', { pairs: counts.map(c => [c.medium, `${c.total} objects`]) });
   ```

## Examples

### Greek/Roman department
```js
const resp = await call('list-departments', {}).catch(() => null);
const greek = (resp?.departments ?? []).find(d => d?.displayName?.includes('Greek'));
const r = await call('search-museum-objects', { q: 'sculpture', departmentId: greek?.departmentId || 13, hasImages: true, pageSize: 20 }).catch(() => null);
const objs = await Promise.all((r?.objectIDs ?? []).slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const items = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const media = ['Terracotta', 'Marble', 'Bronze'];
const data = media.map(m => ({ label: m, value: items.filter(w => (w?.medium || '').includes(m)).length || 1 }));
await widget('chart-rich', { type: 'bar', data });
```

### Japanese prints
```js
const r = await call('search-museum-objects', { q: 'woodblock', departmentId: 6, hasImages: true, pageSize: 1 }).catch(() => null);
await widget('kv', { pairs: [['Woodblock prints (Asian Art)', `${r?.total ?? 0}`]] });
```

## Common mistakes

- **Forgetting the wildcard**: the `q` field is required — pass `q: '*'` (or a generic word) when faceting by `medium`
- **Comparing across departments**: a "marble" count is meaningful in Greek/Roman, irrelevant in Asian — always restrict by `departmentId`
- **One huge fetch**: the goal is the chart, not a detailed table — use `pageSize: 1` per medium just to get `total`
- **Ignoring `mediumExpanded`**: some objects have a richer description — fall back to `medium` only when the expanded form is absent
- **Too many media at once**: 3-5 well-chosen labels make a readable chart; 20 of them is noise
