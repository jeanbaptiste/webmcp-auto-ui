---
id: wiki-compare-two
name: Wikipedia compare two
description: Comparaison côte à côte de deux articles — résumés, faits clés, métriques.
when: the user asks to compare two topics, the differences between A and B, or X vs Y
servers: [wikipedia]
tools_used: [get_summary, extract_key_facts]
data_type: comparison
components_used: [table, text, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards row, two text columns with summaries, full-width comparison table
---

## When to use

The user wants a side-by-side comparison:
- "Compare Newton et Einstein"
- "Différences entre Python et Ruby"
- "Compare Mars and Venus"
- "Newton vs Einstein"

## How to use

1. **Fetch both summaries + key facts in parallel**:
   ```js
   const [sumA, sumB, factsA, factsB] = await Promise.all([
     call('get_summary', { title: 'Isaac Newton' }).catch(() => null),
     call('get_summary', { title: 'Albert Einstein' }).catch(() => null),
     call('extract_key_facts', { title: 'Isaac Newton', count: 5 }).catch(() => null),
     call('extract_key_facts', { title: 'Albert Einstein', count: 5 }).catch(() => null)
   ]);
   const fA = factsA?.facts ?? [];
   const fB = factsB?.facts ?? [];
   ```

2. **Render header stats**:
   ```js
   await widget('stat-card', { label: sumA?.title ?? 'A', value: fA.length, unit: 'facts', icon: 'user' });
   await widget('stat-card', { label: sumB?.title ?? 'B', value: fB.length, unit: 'facts', icon: 'user' });
   await widget('stat-card', { label: 'Facts compared', value: Math.min(fA.length, fB.length), icon: 'list' });
   ```

3. **Render two summary blocks**:
   ```js
   await widget('text', { content: `**${sumA?.title ?? '—'}** — ${sumA?.summary ?? '(no summary)'}` });
   await widget('text', { content: `**${sumB?.title ?? '—'}** — ${sumB?.summary ?? '(no summary)'}` });
   ```

4. **Render the comparison table** by aligning facts row by row:
   ```js
   const rows = [];
   const n = Math.max(fA.length, fB.length);
   for (let i = 0; i < n; i++) {
     rows.push([`Fact ${i + 1}`, fA[i] ?? '—', fB[i] ?? '—']);
   }
   await widget('data-table', { columns: ['#', sumA?.title ?? 'A', sumB?.title ?? 'B'], rows });
   ```

## Examples

### Newton vs Einstein
```js
const [a, b, fa, fb] = await Promise.all([
  call('get_summary', { title: 'Isaac Newton' }).catch(() => null),
  call('get_summary', { title: 'Albert Einstein' }).catch(() => null),
  call('extract_key_facts', { title: 'Isaac Newton', count: 5 }).catch(() => null),
  call('extract_key_facts', { title: 'Albert Einstein', count: 5 }).catch(() => null)
]);
await widget('text', { content: a?.summary ?? '(no summary)' });
await widget('text', { content: b?.summary ?? '(no summary)' });
const fAll = fa?.facts ?? [];
const fBall = fb?.facts ?? [];
await widget('data-table', {
  columns: ['#', a?.title ?? 'A', b?.title ?? 'B'],
  rows: fAll.map((f, i) => [i + 1, f, fBall[i] ?? '—'])
});
```

### Python vs Ruby
```js
const [a, b] = await Promise.all([
  call('get_summary', { title: 'Python (programming language)' }).catch(() => null),
  call('get_summary', { title: 'Ruby (programming language)' }).catch(() => null)
]);
await widget('text', { content: a?.summary ?? '(no summary)' });
await widget('text', { content: b?.summary ?? '(no summary)' });
```

## Common mistakes

- **Comparing facts that aren't aligned**: row-N of A and row-N of B aren't semantically paired — label them by index, not by claimed equivalence
- **Asking for different `count`** for A and B: keep them equal so the table balances
- **Truncating summaries to 80 chars**: comparison loses meaning — keep full summary or ≥250 chars
- **Forgetting disambiguation**: "Python" alone may resolve to the snake — use `Python (programming language)`
- **Using sequential calls**: always parallelize the 4 calls with `Promise.all`
- **Hardcoding `Subject A` / `Subject B`** as table headers: use the actual titles for clarity
