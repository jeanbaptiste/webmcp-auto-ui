---
id: wiki-key-facts
name: Wikipedia key facts
description: Faits saillants extraits d'un article en cartes — idéal pour fiches de révision et briefings.
when: the user asks for key facts, important figures, briefing-style bullets, or quiz-ready info on a topic
servers: [wikipedia]
tools_used: [extract_key_facts, get_summary]
data_type: list
components_used: [cards, stat-card]
layout:
  type: grid
  columns: 3
  arrangement: stat-cards row at top, fact cards in a 3-col grid below
---

## When to use

The user wants high-density information for a quick read:
- "Donne-moi 5 faits clés sur la Tour Eiffel"
- "Les chiffres importants sur l'Antarctique"
- "Quick facts about black holes"
- "Briefing sur la Grande Muraille"

## How to use

1. **Extract the facts** (count is tunable, 5-10 is sweet spot):
   ```js
   const f = await call('extract_key_facts', { title: 'Eiffel Tower', count: 7 }).catch(() => null);
   const facts = f?.facts ?? [];
   if (facts.length === 0) return widget('text', { content: 'No facts extracted.' });
   ```

2. **Get a contextual summary** (one-line topic intro):
   ```js
   const sum = await call('get_summary', { title: 'Eiffel Tower' }).catch(() => null);
   ```

3. **Render stat-cards + fact cards**:
   ```js
   await widget('stat-card', { label: 'Facts', value: facts.length, icon: 'list-checks' });
   await widget('stat-card', { label: 'Topic', value: f?.title ?? '—', icon: 'book-open' });
   await widget('cards', {
     items: facts.map((fact, i) => ({
       title: `Fact ${i + 1}`,
       body: fact
     }))
   });
   ```

## Examples

### 7 facts on the Eiffel Tower
```js
const f = await call('extract_key_facts', { title: 'Eiffel Tower', count: 7 }).catch(() => null);
const facts = f?.facts ?? [];
await widget('stat-card', { label: 'Facts', value: facts.length, icon: 'list-checks' });
await widget('cards', {
  items: facts.map((fact, i) => ({ title: `#${i + 1}`, body: fact }))
});
```

### Briefing on Antarctica with topic focus
```js
const [f, sum] = await Promise.all([
  call('extract_key_facts', { title: 'Antarctica', topic_within_article: 'Climate', count: 6 }).catch(() => null),
  call('get_summary', { title: 'Antarctica' }).catch(() => null)
]);
const facts = f?.facts ?? [];
await widget('stat-card', { label: 'Facts', value: facts.length, icon: 'snowflake' });
await widget('cards', { items: facts.map((fact, i) => ({ title: `Fact ${i + 1}`, body: fact })) });
```

## Common mistakes

- **Asking for `count: 50`**: the tool degrades gracefully but returns increasingly low-value facts past 10
- **Forgetting `topic_within_article`** when the user asks about a specific aspect ("climate", "history") — adding it sharpens the extraction
- **Rendering facts as a single text blob**: cards make each fact scannable ; text widget hides them
- **Using `extract_key_facts` for narrative flow**: facts are atomic statements, not a story — use `summarize_article_section` for narrative
- **Not handling `facts: []`**: if the article is too short, the array may be empty — render a stat-card "No facts extracted"
- **Hardcoding `count: 5`**: respect the user's number ("Donne-moi 10 faits" → `count: 10`)
