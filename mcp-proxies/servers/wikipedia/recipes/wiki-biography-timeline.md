---
id: wiki-biography-timeline
name: Wikipedia biography timeline
description: Biographie chronologique avec frise des événements clés extraits de l'article.
when: the user asks for the life of a person, a biography, or a chronological journey of a historical figure
servers: [wikipedia]
tools_used: [get_article, extract_key_facts, get_sections]
data_type: article
components_used: [profile, timeline, text, kv]
layout:
  type: grid
  columns: 2
  arrangement: profile + summary on top, timeline full-width below, kv metadata aside
---

## When to use

The user wants a structured biography rather than a flat article:
- "Raconte la vie de Léonard de Vinci"
- "Parcours de Nelson Mandela"
- "Biographie de Marie Curie"
- "Tell me the life story of Alan Turing"

## How to use

1. **Fetch the article + sections** (sections drive the chrono structure):
   ```js
   const art = await call('get_article', { title: 'Leonardo da Vinci' }).catch(() => null);
   if (!art || art?.exists === false) return widget('text', { content: 'Page not found.' });
   const secs = await call('get_sections', { title: 'Leonardo da Vinci' }).catch(() => null);
   ```

2. **Extract chronological facts** for two-three "phase" sections:
   ```js
   const earlyFacts = await call('extract_key_facts', { title: 'Leonardo da Vinci', topic_within_article: 'Early life', count: 4 }).catch(() => null);
   const careerFacts = await call('extract_key_facts', { title: 'Leonardo da Vinci', topic_within_article: 'Career', count: 4 }).catch(() => null);
   ```

3. **Render the profile + summary**:
   ```js
   await widget('profile', { name: art?.title ?? '—', subtitle: (art?.categories ?? [])[0] || '', fields: art?.url ? [{ label: 'Source', value: art.url }] : [] });
   await widget('text', { content: art?.summary ?? '' });
   ```

4. **Render the timeline** by combining facts with phase labels:
   ```js
   const events = [
     ...((earlyFacts?.facts ?? []).map(f => ({ phase: 'Early life', text: f }))),
     ...((careerFacts?.facts ?? []).map(f => ({ phase: 'Career', text: f })))
   ];
   await widget('timeline', {
     events: events.map((e, i) => ({ date: `#${i + 1}`, title: e.phase, description: e.text }))
   });
   await widget('kv', {
     rows: [
       ['Sections', String((secs?.sections ?? []).length)],
       ['Categories', String((art?.categories ?? []).length)]
     ]
   });
   ```

## Examples

### Leonardo da Vinci
```js
const art = await call('get_article', { title: 'Leonardo da Vinci' }).catch(() => null);
if (!art || art?.exists === false) return widget('text', { content: 'Page not found.' });
const early = await call('extract_key_facts', { title: 'Leonardo da Vinci', topic_within_article: 'Early life', count: 3 }).catch(() => null);
const career = await call('extract_key_facts', { title: 'Leonardo da Vinci', topic_within_article: 'Career', count: 3 }).catch(() => null);
await widget('profile', { name: art?.title ?? '—', fields: art?.url ? [{ label: 'Source', value: art.url }] : [] });
await widget('text', { content: art?.summary ?? '' });
await widget('timeline', {
  events: [
    ...((early?.facts ?? []).map(f => ({ title: 'Early life', description: f }))),
    ...((career?.facts ?? []).map(f => ({ title: 'Career', description: f })))
  ]
});
```

### Nelson Mandela
```js
const art = await call('get_article', { title: 'Nelson Mandela' }).catch(() => null);
if (!art || art?.exists === false) return widget('text', { content: 'Page not found.' });
const f1 = await call('extract_key_facts', { title: 'Nelson Mandela', topic_within_article: 'Activism', count: 4 }).catch(() => null);
const f2 = await call('extract_key_facts', { title: 'Nelson Mandela', topic_within_article: 'Presidency', count: 4 }).catch(() => null);
await widget('profile', { name: art?.title ?? '—', fields: art?.url ? [{ label: 'Source', value: art.url }] : [] });
await widget('timeline', {
  events: [
    ...((f1?.facts ?? []).map(f => ({ title: 'Activism', description: f }))),
    ...((f2?.facts ?? []).map(f => ({ title: 'Presidency', description: f })))
  ]
});
```

## Common mistakes

- **Hardcoding "Early life" and "Career"**: section names vary by article (and language) — use `get_sections` to pick real names
- **Rendering all facts as one timeline phase**: split by `topic_within_article` to give the timeline real structure
- **Missing dates**: `extract_key_facts` returns prose, not structured dates — frame events by phase rather than fake date strings
- **Using `extract_key_facts` for non-biographical articles**: the timeline pattern only works on people / events / movements
- **Calling 4+ extract_key_facts in a row**: cap at 2-3 phases to keep latency reasonable
- **Forgetting `art.exists === false`**: handle missing pages with a friendly fallback before rendering
