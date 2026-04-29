---
id: wiki-connectivity-check
name: Wikipedia connectivity check
description: Diagnostic du serveur Wikipedia — statut, langue, URL, latence.
when: the user runs an admin diagnostic, asks if Wikipedia is reachable, or before launching a batch of calls
servers: [wikipedia]
tools_used: [test_wikipedia_connectivity]
data_type: diagnostic
components_used: [kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards row at top, kv detail below
---

## When to use

Operations / debug scenario:
- "Le serveur Wikipédia FR fonctionne-t-il ?"
- "Vérifie la connectivité MCP wikipedia"
- "Wikipedia health check"
- "Diagnostic before running 50 lookups"

## How to use

1. **Run the diagnostic** (no parameters):
   ```js
   const c = await call('test_wikipedia_connectivity', {});
   ```

2. **Render headline status + detail**:
   ```js
   await widget('stat-card', {
     label: 'Status',
     value: c.status,
     icon: c.status === 'success' ? 'check-circle' : 'alert-triangle'
   });
   await widget('stat-card', { label: 'Language', value: c.language, icon: 'globe' });
   await widget('stat-card', { label: 'Latency', value: `${Math.round(c.response_time_ms)} ms`, icon: 'zap' });
   await widget('kv', {
     items: [
       { label: 'Site name', value: c.site_name || '—' },
       { label: 'Server', value: c.server || '—' },
       { label: 'API URL', value: c.url || '—' },
       { label: 'Response time', value: `${c.response_time_ms?.toFixed(2)} ms` }
     ]
   });
   ```

## Examples

### Quick health check
```js
const c = await call('test_wikipedia_connectivity', {});
await widget('stat-card', { label: 'Status', value: c.status, icon: 'check-circle' });
await widget('stat-card', { label: 'Lang', value: c.language, icon: 'globe' });
await widget('kv', { items: [{ label: 'Server', value: c.server }, { label: 'Latency', value: `${c.response_time_ms} ms` }] });
```

### Pre-batch verification
```js
const c = await call('test_wikipedia_connectivity', {});
if (c.status !== 'success') {
  await widget('stat-card', { label: 'Status', value: 'DOWN', icon: 'alert-triangle' });
  await widget('kv', { items: [{ label: 'Server', value: c.server }, { label: 'Error', value: c.status }] });
} else {
  await widget('stat-card', { label: 'Ready', value: c.language, icon: 'check' });
}
```

## Common mistakes

- **Running it in a loop**: it's a one-shot probe — don't poll faster than every few seconds
- **Hiding the latency**: response_time_ms is the headline metric for ops
- **Ignoring `status !== 'success'`**: branch on it before running other tools
- **Coercing latency without rounding**: `123.4567 ms` is noisy — round to integer or 2 decimals
- **Assuming `site_name` is always present**: fallback to `'—'` for missing fields
- **Conflating MCP server health with Wikipedia health**: this checks the upstream Wikipedia API, not the MCP transport
