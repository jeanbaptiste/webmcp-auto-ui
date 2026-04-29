---
id: wiki-section-deepdive
name: Wikipedia section deep-dive
description: Plongée dans une section spécifique d'un article — sommaire complet + résumé condensé.
when: the user asks for a specific section of an article, the history part, or wants to skip to a chapter
servers: [wikipedia]
tools_used: [get_sections, summarize_article_section]
data_type: text
components_used: [text, table, kv]
layout:
  type: grid
  columns: 2
  arrangement: sections table on the left, focused section summary on the right
---

## When to use

The user wants to navigate a long article like a book and jump to a chapter:
- "Résume la section Histoire de l'article Internet"
- "Que dit la partie Économie de l'article France ?"
- "Section Geography of the United States article"

## How to use

1. **List all sections** to confirm the target exists:
   ```js
   const all = await call('get_sections', { title: 'Internet' }).catch(() => null);
   const sections = all?.sections ?? [];
   ```

2. **Render the table of contents** (so the user sees siblings):
   ```js
   await widget('table', {
     columns: ['Section', 'Level'],
     rows: sections.map(s => [s?.title ?? '—', s?.level ?? '—'])
   });
   ```

3. **Summarize the targeted section**:
   ```js
   const sec = await call('summarize_article_section', {
     title: 'Internet',
     section_title: 'History',
     max_length: 220
   }).catch(() => null);
   await widget('kv', {
     items: [
       { label: 'Article', value: sec?.title ?? '—' },
       { label: 'Section', value: sec?.section_title ?? '—' }
     ]
   });
   await widget('text', { content: sec?.summary ?? '(no section summary)' });
   ```

## Examples

### History of Internet
```js
const all = await call('get_sections', { title: 'Internet' }).catch(() => null);
const sec = await call('summarize_article_section', { title: 'Internet', section_title: 'History', max_length: 250 }).catch(() => null);
await widget('table', { columns: ['Section', 'Level'], rows: (all?.sections ?? []).map(s => [s?.title ?? '—', s?.level ?? '—']) });
await widget('kv', { items: [{ label: 'Section', value: sec?.section_title ?? '—' }] });
await widget('text', { content: sec?.summary ?? '(no section summary)' });
```

### Économie de la France
```js
const all = await call('get_sections', { title: 'France' }).catch(() => null);
const sec = await call('summarize_article_section', { title: 'France', section_title: 'Économie', max_length: 280 }).catch(() => null);
await widget('table', { columns: ['Section', 'Niveau'], rows: (all?.sections ?? []).map(s => [s?.title ?? '—', s?.level ?? '—']) });
await widget('text', { content: sec?.summary ?? '(no section summary)' });
```

## Common mistakes

- **Passing a section title that doesn't exist**: `summarize_article_section` returns a generic message — always call `get_sections` first to validate
- **Mismatched casing**: `History` vs `history` may differ depending on language ; copy the exact casing from `get_sections`
- **Translating the section title**: the section_title must match the article's language (e.g. `Économie` not `Economy` for fr.wikipedia)
- **Setting `max_length: 50`**: too short to convey a section — minimum 150
- **Skipping the TOC**: showing only the focused summary loses navigation context
- **Calling both tools sequentially when only one is needed**: if the user names an explicit section, you can skip `get_sections` after first validation
