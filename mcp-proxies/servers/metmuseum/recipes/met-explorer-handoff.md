---
id: met-explorer-handoff
name: Brief and hand off to the interactive Met Explorer
description: Short text intro + KV of pre-selected filters + stat-card of expected matches, then opens the Explorer
when: the user wants free interactive exploration ("open the explorer", "let me browse Japanese art")
servers: [metmuseum]
tools_used: [list-departments, search-museum-objects, open-met-explorer]
data_type: handoff interactif
components_used: [text, kv, stat-card]
layout:
  type: grid
  columns: 1
  arrangement: text intro at top, kv + stat-card on a row, then the Explorer launches
---

## When to use

- "I want to explore freely"
- "Open the explorer for Japanese art"
- "Launch the interactive mode"
- "Let me browse the Met by myself"

## How to use

1. **Resolve the relevant department** (optional but useful):
   ```js
   const resp = await call('list-departments', {}).catch(() => null);
   const departments = resp?.departments ?? [];
   const dept = departments.find(d => d?.displayName?.includes('Asian')) || null;
   ```

2. **Preview the search count** with `pageSize: 1`:
   ```js
   const preview = await call('search-museum-objects', {
     q: 'ukiyo-e',
     departmentId: dept?.departmentId,
     hasImages: true,
     pageSize: 1
   }).catch(() => null);
   ```

3. **Short text intro** (UI-focused, narrative-light):
   ```js
   await widget('text', {
     content: `About to open the Met Explorer pre-loaded for "ukiyo-e" in ${dept?.displayName || 'all departments'}. ${preview?.total ?? 0} objects match.`
   });
   ```

4. **KV of pre-selected filters**:
   ```js
   await widget('kv', {
     rows: [
       ['Query', 'ukiyo-e'],
       ['Department', dept?.displayName || 'All'],
       ['With images', 'Yes'],
       ['Expected matches', String(preview?.total ?? 0)]
     ]
   });
   ```

5. **Stat-card emphasizing the count**:
   ```js
   await widget('stat-card', { label: 'Objects to explore', value: Math.max(preview?.total ?? 0, 1), icon: 'search' });
   ```

6. **Hand off** (last step — opens the Explorer UI):
   ```js
   await call('open-met-explorer', {
     q: 'ukiyo-e',
     departmentId: dept?.departmentId,
     hasImages: true
   });
   ```

## Examples

### Ukiyo-e exploration
```js
const resp = await call('list-departments', {}).catch(() => null);
const asian = (resp?.departments ?? []).find(d => d?.displayName?.includes('Asian'));
const preview = await call('search-museum-objects', { q: 'ukiyo-e', departmentId: asian?.departmentId, hasImages: true, pageSize: 1 }).catch(() => null);
await widget('stat-card', { label: 'Match', value: Math.max(preview?.total ?? 0, 1), icon: 'search' });
await call('open-met-explorer', { q: 'ukiyo-e', departmentId: asian?.departmentId, hasImages: true });
```

### Free-form by title
```js
const preview = await call('search-museum-objects', { q: 'sunflower', hasImages: true, pageSize: 1 }).catch(() => null);
await widget('text', { content: `${preview?.total ?? 0} objects match "sunflower".` });
await widget('stat-card', { label: 'Objects to explore', value: Math.max(preview?.total ?? 0, 1), icon: 'search' });
await call('open-met-explorer', { q: 'sunflower' });
```

## Common mistakes

- **Calling `open-met-explorer` first**: nothing renders before the Explorer takes over — always show the briefing first
- **No preview count**: a stat-card with the expected match number is the whole point — never skip the `pageSize: 1` preview
- **Long narrative**: this is a handoff, keep `text` under one sentence
- **Wrong `departmentId`**: pass it as a number, never as a string
- **Forgetting `hasImages: true`**: most users want pictures — set it on both the preview and the explorer launch
- **Multiple widgets after the handoff**: anything rendered after `open-met-explorer` is lost as the Explorer takes over the canvas
