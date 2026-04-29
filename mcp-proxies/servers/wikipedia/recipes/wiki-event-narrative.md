---
id: wiki-event-narrative
name: Wikipedia event narrative
description: Récit événementiel — timeline des dates clés + résumés des sections Causes/Déroulement/Conséquences.
when: the user asks to retell an event, a historical episode, or wants a narrative reconstruction of a process
servers: [wikipedia]
tools_used: [get_article, get_sections, summarize_article_section, extract_key_facts]
data_type: article
components_used: [timeline, text, gallery, kv]
layout:
  type: vertical
  arrangement: timeline full-width on top, text + kv side by side below, optional gallery footer
---

## When to use

The user wants a structured retelling, not a raw article:
- "Raconte la chute du mur de Berlin"
- "Histoire de la Révolution industrielle"
- "Tell me the story of the moon landing"
- "Comment s'est déroulée la Première Guerre mondiale ?"

## How to use

1. **Fetch the article + sections** to find narrative phases:
   ```js
   const art = await call('get_article', { title: 'Fall of the Berlin Wall' });
   const secs = await call('get_sections', { title: 'Fall of the Berlin Wall' });
   ```

2. **Pick 2-3 narrative sections** (Causes / Course / Consequences when present):
   ```js
   const phases = secs.sections.filter(s => /background|cause|history|aftermath|consequence|impact/i.test(s.title)).slice(0, 3);
   ```

3. **Summarize each phase + extract a few facts**:
   ```js
   const enriched = await Promise.all(phases.map(async p => ({
     title: p.title,
     summary: (await call('summarize_article_section', { title: art.title, section_title: p.title, max_length: 250 })).summary,
     facts: (await call('extract_key_facts', { title: art.title, topic_within_article: p.title, count: 3 })).facts
   })));
   ```

4. **Render the timeline + summary + kv**:
   ```js
   await widget('timeline', {
     events: enriched.flatMap(p => p.facts.map(f => ({ title: p.title, description: f })))
   });
   await widget('text', { content: art.summary });
   await widget('kv', {
     items: enriched.map(p => ({ label: p.title, value: p.summary.slice(0, 200) + '…' }))
   });
   ```

## Examples

### Fall of the Berlin Wall
```js
const art = await call('get_article', { title: 'Fall of the Berlin Wall' });
const secs = await call('get_sections', { title: 'Fall of the Berlin Wall' });
const phases = secs.sections.filter(s => /background|history|aftermath/i.test(s.title)).slice(0, 3);
const enriched = await Promise.all(phases.map(async p => ({
  title: p.title,
  facts: (await call('extract_key_facts', { title: art.title, topic_within_article: p.title, count: 3 })).facts
})));
await widget('timeline', {
  events: enriched.flatMap(p => p.facts.map(f => ({ title: p.title, description: f })))
});
await widget('text', { content: art.summary });
```

### Industrial Revolution narrative
```js
const art = await call('get_article', { title: 'Industrial Revolution' });
const causes = await call('summarize_article_section', { title: 'Industrial Revolution', section_title: 'Causes', max_length: 250 });
const facts = await call('extract_key_facts', { title: 'Industrial Revolution', count: 6 });
await widget('timeline', { events: facts.facts.map(f => ({ title: 'Industrial Revolution', description: f })) });
await widget('text', { content: causes.summary });
```

## Common mistakes

- **Section names vary**: "Background" vs "Origines" vs "Vorgeschichte" — match by regex on lower-cased text
- **Picking too many phases (4+)**: timeline becomes noisy — cap at 3 narrative sections
- **Treating `extract_key_facts` output as dated events**: facts are prose, not dates ; phase the timeline by section instead
- **Calling `get_article` then re-summarizing client-side**: prefer `summarize_article_section` server-side
- **No fallback when no narrative sections match**: use `extract_key_facts` on the whole article as a backup
- **Sequential per-phase calls**: parallelize with `Promise.all` across phases
