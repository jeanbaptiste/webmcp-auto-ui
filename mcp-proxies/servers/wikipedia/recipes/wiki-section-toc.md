---
id: wiki-section-toc
name: Wikipedia section TOC
description: Sommaire hiérarchisé d'un article + intro + statistiques de structure.
when: the user asks for the table of contents, the plan of an article, or a structural overview before reading
servers: [wikipedia]
tools_used: [readArticle, get_summary]
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

1. **Fetch article + summary in parallel**:
   ```js
   const [article, sum] = await Promise.all([
     call('readArticle', { title: 'JavaScript' }).catch(() => null),
     call('get_summary', { title: 'JavaScript' }).catch(() => null)
   ]);
   const lines = (article ?? '').split('\n');
   const sections = lines.filter(l => /^#{1,6}\s/.test(l)).map(l => {
     const m = l.match(/^(#+)\s+(.+)$/);
     return { level: m[1].length, title: m[2].trim() };
   });
   ```

2. **Compute structure stats**:
   ```js
   const n = sections.length;
   const levels = sections.map(s => s.level);
   const maxLevel = levels.length > 0 ? Math.max(...levels) : 1;
   const topLevel = sections.filter(s => s.level === 1).length;
   ```

3. **Render**:
   ```js
   await widget('text', { content: sum?.summary ?? '(no summary)' });
   await widget('stat-card', { label: 'Sections', value: n, icon: 'list' });
   await widget('stat-card', { label: 'Top-level', value: topLevel, icon: 'layers' });
   await widget('stat-card', { label: 'Max depth', value: maxLevel, icon: 'arrow-down' });
   await widget('data-table', {
     columns: ['Section', 'Level'],
     rows: sections.map(s => [`${'  '.repeat(s.level - 1)}${s.title}`, s.level])
   });
   ```

## Examples

### JavaScript
```js
const [article, sum] = await Promise.all([
  call('readArticle', { title: 'JavaScript' }).catch(() => null),
  call('get_summary', { title: 'JavaScript' }).catch(() => null)
]);
const sections = (article ?? '').split('\n').filter(l => /^#{1,6}\s/.test(l)).map(l => {
  const m = l.match(/^(#+)\s+(.+)$/);
  return { level: m[1].length, title: m[2].trim() };
});
await widget('text', { content: sum?.summary ?? '(no summary)' });
await widget('stat-card', { label: 'Sections', value: sections.length, icon: 'list' });
await widget('data-table', { columns: ['Section', 'Level'], rows: sections.map(s => [s.title, s.level]) });
```

### String theory plan
```js
const article = await call('readArticle', { title: 'String theory' }).catch(() => null);
const sections = (article ?? '').split('\n').filter(l => /^#{1,6}\s/.test(l)).map(l => {
  const m = l.match(/^(#+)\s+(.+)$/);
  return { level: m[1].length, title: m[2].trim() };
});
await widget('stat-card', { label: 'Sections', value: sections.length, icon: 'list' });
await widget('data-table', {
  columns: ['#', 'Section', 'Level'],
  rows: sections.map((s, i) => [i + 1, s.title, s.level])
});
```

## Common mistakes

- **Rendering levels as colors instead of indentation**: an indented title in the same column reads better than a separate "Level" badge
- **Ignoring `level`**: without it the user can't tell parent from child sections
- **Using level 0 as default**: Wikipedia sections start at level 1 — coerce missing levels to 1
- **Truncating to top 10**: the whole point is the full plan — keep all rows
- **Skipping the summary**: pure TOC is dry ; the intro gives meaning to the structure
- **Non-numeric `level`**: not an issue with markdown parsing — heading depth is always an integer derived from `#` count
