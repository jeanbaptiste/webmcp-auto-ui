---
id: wiki-section-toc
name: Wikipedia section TOC
description: Sommaire hiérarchisé d'un article + intro + statistiques de structure.
when: the user asks for the table of contents, the plan of an article, or a structural overview before reading
servers: [wikipedia]
tools_used: [get_sections, get_summary]
data_type: structure
components_used: [table, text, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: summary text on top, stat-cards row, sections table full-width below
---

## When to use

The user wants to see the skeleton of a long article:
- "Quel est le plan de l'article Empire romain ?"
- "Sommaire de l'article Théorie des cordes"
- "Show me the structure of the United States article"
- "Plan détaillé de l'Histoire de France"

## How to use

1. **Fetch sections + summary in parallel**:
   ```js
   const [secs, sum] = await Promise.all([
     call('get_sections', { title: 'JavaScript' }).catch(() => null),
     call('get_summary', { title: 'JavaScript' }).catch(() => null)
   ]);
   const sections = secs?.sections ?? [];
   ```

2. **Compute structure stats**:
   ```js
   const n = sections.length;
   const levels = sections.map(s => s?.level || 1).filter(Number.isFinite);
   const maxLevel = levels.length > 0 ? Math.max(...levels) : 1;
   const topLevel = sections.filter(s => s?.level === 1).length;
   ```

3. **Render**:
   ```js
   await widget('text', { content: sum?.summary ?? '(no summary)' });
   await widget('stat-card', { label: 'Sections', value: n, icon: 'list' });
   await widget('stat-card', { label: 'Top-level', value: topLevel, icon: 'layers' });
   await widget('stat-card', { label: 'Max depth', value: maxLevel, icon: 'arrow-down' });
   await widget('data-table', {
     columns: ['Section', 'Level'],
     rows: sections.map(s => [`${'  '.repeat((s?.level || 1) - 1)}${s?.title ?? '—'}`, s?.level ?? 1])
   });
   ```

## Examples

### JavaScript
```js
const [secs, sum] = await Promise.all([
  call('get_sections', { title: 'JavaScript' }).catch(() => null),
  call('get_summary', { title: 'JavaScript' }).catch(() => null)
]);
const sections = secs?.sections ?? [];
await widget('text', { content: sum?.summary ?? '(no summary)' });
await widget('stat-card', { label: 'Sections', value: sections.length, icon: 'list' });
await widget('data-table', { columns: ['Section', 'Level'], rows: sections.map(s => [s?.title ?? '—', s?.level ?? 1]) });
```

### String theory plan
```js
const secs = await call('get_sections', { title: 'String theory' }).catch(() => null);
const sections = secs?.sections ?? [];
await widget('stat-card', { label: 'Sections', value: sections.length, icon: 'list' });
await widget('data-table', {
  columns: ['#', 'Section', 'Level'],
  rows: sections.map((s, i) => [i + 1, s?.title ?? '—', s?.level ?? 1])
});
```

## Common mistakes

- **Rendering levels as colors instead of indentation**: an indented title in the same column reads better than a separate "Level" badge
- **Ignoring `level`**: without it the user can't tell parent from child sections
- **Using level 0 as default**: Wikipedia sections start at level 1 — coerce missing levels to 1
- **Truncating to top 10**: the whole point is the full plan — keep all rows
- **Skipping the summary**: pure TOC is dry ; the intro gives meaning to the structure
- **Non-numeric `level`**: defensive code only — Wikipedia returns integers
