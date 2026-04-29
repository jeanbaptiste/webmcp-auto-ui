---
id: dg-dataservice-openapi
name: Dataservice profile with OpenAPI endpoints
description: Turn a verbose Swagger spec into a readable doc — description text, endpoint table, curl example code blocks, and cards of common errors
when: the user wants to understand how to call a public API listed in dataservices
servers: [datagouv]
tools_used: [get_dataservice_info, get_dataservice_openapi_spec]
data_type: OpenAPI summary
components_used: [text, table, code, cards]
layout:
  type: grid
  columns: 2
  arrangement: text + table top, code blocks + cards below
---

## When to use

The user wants the practical doc of a public API:
- "Détaille l'API SIRENE de l'INSEE"
- "Quels endpoints expose l'API adresse.data.gouv ?"
- "Comment appeler l'API DataPass ?"
- "Donne-moi un exemple curl pour cette API"

This recipe is the "dev landing page" for a public API.

## How to use

1. **Fetch info + OpenAPI spec**:
   ```js
   const [info, spec] = await Promise.all([
     call('get_dataservice_info', { dataservice_id }).catch(() => null),
     call('get_dataservice_openapi_spec', { dataservice_id }).catch(() => null)
   ]);
   if (!info) {
     await widget('text', { content: 'Dataservice introuvable.' });
     return;
   }
   ```

2. **Render**:
   ```js
   await widget('text', {
     title: info.title ?? '—',
     subtitle: info.organization?.name ?? '',
     content: info.description ?? ''
   });

   const endpoints = spec?.endpoints ?? [];
   await widget('table', {
     columns: ['Méthode', 'Path', 'Description', 'Auth'],
     rows: endpoints.map(e => [e.method ?? '—', e.path ?? '—', e.summary ?? '—', e.security ? '🔒' : '—'])
   });

   const sample = endpoints[0];
   if (sample) {
     const curl = `curl -X ${sample.method ?? 'GET'} '${info.base_api_url ?? ''}${sample.path ?? ''}' \\\n  -H 'Accept: application/json'`;
     await widget('code', { language: 'bash', code: curl });
   }

   await widget('cards', {
     items: (spec?.common_errors ?? [
       { code: 401, message: 'Token manquant ou invalide' },
       { code: 429, message: 'Quota dépassé — backoff exponentiel' },
       { code: 503, message: 'Service indisponible — retry' }
     ]).map(e => ({ title: `${e.code}`, description: e.message ?? '' }))
   });
   ```

## Examples

### SIRENE API by INSEE
```js
const [info, spec] = await Promise.all([
  call('get_dataservice_info', { dataservice_id: '<sirene-dataservice-id>' }).catch(() => null),
  call('get_dataservice_openapi_spec', { dataservice_id: '<sirene-dataservice-id>' }).catch(() => null)
]);
if (!info) { await widget('text', { content: 'Dataservice introuvable.' }); return; }
await widget('text', { title: info.title ?? '—', content: info.description ?? '' });
await widget('table', { columns: ['Méthode', 'Path', 'Description'], rows: (spec?.endpoints ?? []).map(e => [e.method ?? '—', e.path ?? '—', e.summary ?? '—']) });
await widget('code', { language: 'bash', code: `curl '${info.base_api_url ?? ''}/siret/12345678900012' -H 'Authorization: Bearer YOUR_TOKEN'` });
```

### adresse.data.gouv.fr API
```js
const [info, spec] = await Promise.all([
  call('get_dataservice_info', { dataservice_id: '<adresse-dataservice-id>' }).catch(() => null),
  call('get_dataservice_openapi_spec', { dataservice_id: '<adresse-dataservice-id>' }).catch(() => null)
]);
if (!info) { await widget('text', { content: 'Dataservice introuvable.' }); return; }
await widget('table', { columns: ['Méthode', 'Path'], rows: (spec?.endpoints ?? []).map(e => [e.method ?? '—', e.path ?? '—']) });
await widget('code', { language: 'bash', code: `curl '${info.base_api_url ?? ''}/search/?q=8+rue+de+la+paix+Paris'` });
```

## Common mistakes

- **Pasting the full OpenAPI spec** in `code` — the table summary is enough; only show one or two curl examples.
- **Forgetting auth headers** — many state APIs need an OAuth2 token via DataPass; mention it in the cards section.
- **Hardcoding the base URL** — always use `info.base_api_url`; some APIs migrate domains and the spec lags.
- **Showing every error code** — limit to the 4-5 most actionable ones (401, 403, 404, 429, 503).
- **Not surfacing rate limits** — many APIs enforce 5-30 calls/min; check the spec `x-rate-limit` extensions and warn the user.
