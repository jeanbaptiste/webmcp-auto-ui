---
id: wiki-section-deepdive
name: Wikipedia section deep-dive
description: Plongée dans une section spécifique d'un article — sommaire complet + contenu de la section ciblée.
when: the user asks for a specific section of an article, the history part, or wants to skip to a chapter
servers: [wikipedia]
tools_used: [search, readArticle]
data_type: text
components_used: [text, data-table, kv]
layout:
  type: grid
  columns: 2
  arrangement: sections table on the left, focused section content on the right
---

## When to use

The user wants to navigate a long article like a book and jump to a chapter:
- "Résume la section Histoire de l'article Internet"
- "Que dit la partie Économie de l'article France ?"
- "Section Geography of the United States article"

## How to use

1. **Search to get the canonical title**:
   ```js
   const results = await call('search', { query: 'Internet' }).catch(() => null);
   if (!results || results.length === 0) return widget('text', { content: 'No article found.' });
   const firstText = results[0]?.text ?? '';
   const titleMatch = firstText.match(/^\*\*(.+?)\*\*/);
   const title = titleMatch ? titleMatch[1] : 'Internet';
   ```

2. **Fetch the full article**:
   ```js
   const article = await call('readArticle', { title }).catch(() => null);
   if (!article) return widget('text', { content: 'Article not found.' });
   const extract = typeof article === 'string' ? article : (article?.extract ?? '');
   const url = article?.url ?? null;
   ```

3. **Parse headings from the markdown extract**:
   ```js
   const lines = extract.split('\n');
   const headings = lines
     .filter(l => /^#{1,6}\s/.test(l))
     .map(l => {
       const m = l.match(/^(#{1,6})\s+(.+)/);
       return m ? [m[2].trim(), String(m[1].length)] : null;
     })
     .filter(Boolean);
   ```

4. **Render the table of contents** (so the user sees siblings):
   ```js
   await widget('kv', {
     rows: [
       ['Article', title],
       ['URL', url ?? '—'],
       ['Sections', String(headings.length)]
     ]
   });
   if (headings.length > 0) {
     await widget('data-table', {
       columns: ['Section', 'Level'],
       rows: headings
     });
   }
   ```

5. **Extract and display the targeted section content**:
   ```js
   const targetSection = 'History'; // replace with user-requested section
   // Find the heading line index
   const headingIdx = lines.findIndex(l => {
     const m = l.match(/^#{1,6}\s+(.+)/);
     return m && m[1].trim().toLowerCase() === targetSection.toLowerCase();
   });
   if (headingIdx === -1) {
     await widget('text', { content: `Section "${targetSection}" not found in this article.` });
   } else {
     const headingLevel = (lines[headingIdx].match(/^(#{1,6})/)?.[1] ?? '#').length;
     // Collect lines until next heading of same or higher level
     const sectionLines = [];
     for (let i = headingIdx + 1; i < lines.length; i++) {
       const m = lines[i].match(/^(#{1,6})\s/);
       if (m && m[1].length <= headingLevel) break;
       sectionLines.push(lines[i]);
     }
     const sectionText = sectionLines.join('\n').trim();
     await widget('text', { content: sectionText || '(empty section)' });
   }
   ```

## Examples

### History of Internet
```js
const results = await call('search', { query: 'Internet' }).catch(() => null);
if (!results || results.length === 0) return widget('text', { content: 'No article found.' });
const firstText = results[0]?.text ?? '';
const titleMatch = firstText.match(/^\*\*(.+?)\*\*/);
const title = titleMatch ? titleMatch[1] : 'Internet';

const article = await call('readArticle', { title }).catch(() => null);
if (!article) return widget('text', { content: 'Article not found.' });
const extract = typeof article === 'string' ? article : (article?.extract ?? '');
const url = article?.url ?? null;

const lines = extract.split('\n');
const headings = lines
  .filter(l => /^#{1,6}\s/.test(l))
  .map(l => { const m = l.match(/^(#{1,6})\s+(.+)/); return m ? [m[2].trim(), String(m[1].length)] : null; })
  .filter(Boolean);

await widget('kv', {
  rows: [
    ['Article', title],
    ['URL', url ?? '—'],
    ['Sections', String(headings.length)]
  ]
});
if (headings.length > 0) {
  await widget('data-table', { columns: ['Section', 'Level'], rows: headings });
}

const targetSection = 'History';
const headingIdx = lines.findIndex(l => { const m = l.match(/^#{1,6}\s+(.+)/); return m && m[1].trim().toLowerCase() === targetSection.toLowerCase(); });
if (headingIdx === -1) {
  await widget('text', { content: `Section "${targetSection}" not found.` });
} else {
  const headingLevel = (lines[headingIdx].match(/^(#{1,6})/)?.[1] ?? '#').length;
  const sectionLines = [];
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= headingLevel) break;
    sectionLines.push(lines[i]);
  }
  await widget('text', { content: sectionLines.join('\n').trim() || '(empty section)' });
}
```

### Économie de la France
```js
const results = await call('search', { query: 'France' }).catch(() => null);
if (!results || results.length === 0) return widget('text', { content: 'No article found.' });
const firstText = results[0]?.text ?? '';
const titleMatch = firstText.match(/^\*\*(.+?)\*\*/);
const title = titleMatch ? titleMatch[1] : 'France';

const article = await call('readArticle', { title }).catch(() => null);
if (!article) return widget('text', { content: 'Article not found.' });
const extract = typeof article === 'string' ? article : (article?.extract ?? '');

const lines = extract.split('\n');
const headings = lines
  .filter(l => /^#{1,6}\s/.test(l))
  .map(l => { const m = l.match(/^(#{1,6})\s+(.+)/); return m ? [m[2].trim(), String(m[1].length)] : null; })
  .filter(Boolean);

await widget('kv', { rows: [['Article', title], ['Sections', String(headings.length)]] });
if (headings.length > 0) {
  await widget('data-table', { columns: ['Section', 'Niveau'], rows: headings });
}

const targetSection = 'Économie';
const headingIdx = lines.findIndex(l => { const m = l.match(/^#{1,6}\s+(.+)/); return m && m[1].trim().toLowerCase() === targetSection.toLowerCase(); });
if (headingIdx === -1) {
  await widget('text', { content: `Section "${targetSection}" non trouvée.` });
} else {
  const headingLevel = (lines[headingIdx].match(/^(#{1,6})/)?.[1] ?? '#').length;
  const sectionLines = [];
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= headingLevel) break;
    sectionLines.push(lines[i]);
  }
  await widget('text', { content: sectionLines.join('\n').trim() || '(section vide)' });
}
```

## Common mistakes

- **Using non-existent tools** (`get_sections`, `summarize_article_section`): only `search` and `readArticle` exist in this server
- **Treating `readArticle` result as a plain string**: it returns `{title, extract, pageid, url}` — use `.extract` for the markdown content
- **Using `items: [{label, value}]` for kv widget**: the schema requires `rows: [[string, string], ...]` — each row is a 2-element array
- **Forgetting to coerce numbers to strings in kv rows**: all values must be strings — use `String(count)`
- **Case-insensitive matching**: use `.toLowerCase()` on both sides when searching for a section heading
- **Skipping the TOC**: showing only the focused section loses navigation context
- **Not guarding null returns**: both `search` and `readArticle` can fail — always `.catch(() => null)` and check before rendering
