---
id: wiki-article-overview
name: Wikipedia article overview
description: Fiche encyclopédique structurée — profil, intro, sommaire et métadonnées d'un article Wikipedia.
when: the user asks for a complete article overview, an encyclopedic factsheet, or a 360° view on a topic
servers: [wikipedia]
tools_used: [search, readArticle]
data_type: article
components_used: [profile, text, kv, data-table]
---

## When to use

The user wants a complete encyclopedic factsheet:
- "Donne-moi une fiche complète sur Marie Curie"
- "Présente-moi le Mont Fuji"
- "Fiche complète sur Alan Turing"
- "Tell me everything about the Eiffel Tower"

This recipe combines a short intro paragraph, structured metadata, and a table of contents derived from the article markdown headings.

## How to use

1. **Search to get the canonical title and URL**:
   ```js
   const results = await call('search', { query: 'Alan Turing' }).catch(() => null);
   if (!results || results.length === 0) return widget('text', { content: 'No article found.' });
   // Extract title and URL from the first result text
   const firstText = results[0]?.text ?? '';
   const titleMatch = firstText.match(/^\*\*(.+?)\*\*/);
   const urlMatch = firstText.match(/Article link:\s*(https?:\/\/\S+)/);
   const title = titleMatch ? titleMatch[1] : 'Unknown';
   const url = urlMatch ? urlMatch[1] : null;
   ```

2. **Fetch the full article markdown**:
   ```js
   const markdown = await call('readArticle', { title }).catch(() => null);
   if (!markdown) return widget('text', { content: 'Article not found.' });
   ```

3. **Extract intro paragraph and headings from the markdown**:
   ```js
   const lines = markdown.split('\n');
   // First non-empty, non-heading paragraph = intro
   const intro = lines.find(l => l.trim() && !l.startsWith('#')) ?? '';
   // Collect all headings (## = level 2, ### = level 3, etc.)
   const headings = lines
     .filter(l => /^#{1,6}\s/.test(l))
     .map(l => {
       const m = l.match(/^(#{1,6})\s+(.+)/);
       return m ? [m[2].trim(), String(m[1].length)] : null;
     })
     .filter(Boolean);
   ```

4. **Render the profile + intro**:
   ```js
   await widget('profile', { name: title, fields: url ? [{ label: 'Source', value: url }] : [] });
   await widget('text', { content: intro || '(no intro available)' });
   ```

5. **Metadata as kv + sections as data-table**:
   ```js
   await widget('kv', {
     rows: [
       ['Title', title],
       ['URL', url ?? '—'],
       ['Sections', String(headings.length)],
       ['Approx. words', String(markdown.split(/\s+/).length)]
     ]
   });
   if (headings.length > 0) {
     await widget('data-table', {
       columns: ['Section', 'Level'],
       rows: headings
     });
   }
   ```

## Examples

### Marie Curie factsheet
```js
const results = await call('search', { query: 'Marie Curie' }).catch(() => null);
if (!results || results.length === 0) return widget('text', { content: 'No article found.' });
const firstText = results[0]?.text ?? '';
const titleMatch = firstText.match(/^\*\*(.+?)\*\*/);
const urlMatch = firstText.match(/Article link:\s*(https?:\/\/\S+)/);
const title = titleMatch ? titleMatch[1] : 'Marie Curie';
const url = urlMatch ? urlMatch[1] : null;

const markdown = await call('readArticle', { title }).catch(() => null);
if (!markdown) return widget('text', { content: 'Article not found.' });

const lines = markdown.split('\n');
const intro = lines.find(l => l.trim() && !l.startsWith('#')) ?? '';
const headings = lines
  .filter(l => /^#{1,6}\s/.test(l))
  .map(l => { const m = l.match(/^(#{1,6})\s+(.+)/); return m ? [m[2].trim(), String(m[1].length)] : null; })
  .filter(Boolean);

await widget('profile', { name: title, fields: url ? [{ label: 'Source', value: url }] : [] });
await widget('text', { content: intro || '(no intro available)' });
await widget('kv', {
  rows: [
    ['Title', title],
    ['URL', url ?? '—'],
    ['Sections', String(headings.length)],
    ['Approx. words', String(markdown.split(/\s+/).length)]
  ]
});
if (headings.length > 0) {
  await widget('data-table', { columns: ['Section', 'Level'], rows: headings });
}
```

### Mont Fuji factsheet
```js
const results = await call('search', { query: 'Mount Fuji' }).catch(() => null);
if (!results || results.length === 0) return widget('text', { content: 'No article found.' });
const firstText = results[0]?.text ?? '';
const titleMatch = firstText.match(/^\*\*(.+?)\*\*/);
const urlMatch = firstText.match(/Article link:\s*(https?:\/\/\S+)/);
const title = titleMatch ? titleMatch[1] : 'Mount Fuji';
const url = urlMatch ? urlMatch[1] : null;

const markdown = await call('readArticle', { title }).catch(() => null);
if (!markdown) return widget('text', { content: 'Article not found.' });

const lines = markdown.split('\n');
const intro = lines.find(l => l.trim() && !l.startsWith('#')) ?? '';

await widget('profile', { name: title, fields: url ? [{ label: 'Source', value: url }] : [] });
await widget('text', { content: intro || '(no intro available)' });
```

## Common mistakes

- **Using non-existent tools** (`get_summary`, `get_article`, `get_sections`): only `search` and `readArticle` exist in this server
- **Treating `readArticle` result as a structured object**: it returns a plain markdown string, not `{title, extract, pageid, ...}`
- **Treating `search` result as `{title, pageid, url}` objects**: results are `{type:"text", text:"**Title**\n..."}` — parse the text to extract title and URL
- **Using `items: [{label, value}]` for kv widget**: the schema requires `rows: [[string, string], ...]` — each row is a 2-element array
- **Calling `readArticle` with a raw user query**: search first to get the canonical Wikipedia title, then use that exact title for `readArticle`
- **Forgetting to coerce numbers to strings in kv rows**: all values must be strings — use `String(count)`
- **Not guarding null returns**: both `search` and `readArticle` can fail — always `.catch(() => null)` and check before rendering
