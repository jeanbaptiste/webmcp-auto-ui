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
   const dataservice_id = '6661e60fda535e9773c510ca'; // API Sirene
   const _all = await Promise.all([
     call('get_dataservice_info', { dataservice_id }).catch(() => null),
     call('get_dataservice_openapi_spec', { dataservice_id }).catch(() => null)
   ]);
   const info = _all[0];
   const spec = _all[1];
   if (!info) {
     await widget('text', { content: 'Dataservice introuvable.' });
   }
   ```

2. **Render**:
   ```js
   const I = info ?? {};
   await widget('text', {
     title: I.title ?? '—',
     subtitle: I.organization?.name ?? '',
     content: I.description ?? ''
   });

   const endpoints = spec?.endpoints ?? [];
   await widget('data-table', {
     columns: ['Méthode', 'Path', 'Description', 'Params'],
     rows: endpoints.map(e => [e.method ?? '—', e.path ?? '—', e.summary ?? '—', (e.parameters ?? []).length])
   });

   const sample = endpoints[0];
   const curlCmd = sample
     ? `curl -X ${sample.method ?? 'GET'} '${I.base_api_url ?? ''}${sample.path ?? ''}' \\\n  -H 'Accept: application/json'`
     : `curl '${I.base_api_url ?? ''}'`;
   await widget('code', { language: 'bash', code: curlCmd });

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
const _ex = await Promise.all([
  call('get_dataservice_info', { dataservice_id: '6661e60fda535e9773c510ca' }).catch(() => null),
  call('get_dataservice_openapi_spec', { dataservice_id: '6661e60fda535e9773c510ca' }).catch(() => null)
]);
const sirInfo = _ex[0] ?? {};
const sirSpec = _ex[1] ?? {};
await widget('text', { title: sirInfo.title ?? '—', content: sirInfo.description ?? '' });
await widget('data-table', { columns: ['Méthode', 'Path', 'Description'], rows: (sirSpec?.endpoints ?? []).map(e => [e.method ?? '—', e.path ?? '—', e.summary ?? '—']) });
await widget('code', { language: 'bash', code: `curl '${sirInfo.base_api_url ?? ''}/siret/12345678900012' -H 'Authorization: Bearer YOUR_TOKEN'` });
```

### Discover an adresse-related API
```js
const adrSearch = await call('search_dataservices', { query: 'adresse', page_size: 1 }).catch(() => ({ dataservices: [] }));
const adr_id = adrSearch?.dataservices?.[0]?.id;
const _adr = adr_id ? await Promise.all([
  call('get_dataservice_info', { dataservice_id: adr_id }).catch(() => null),
  call('get_dataservice_openapi_spec', { dataservice_id: adr_id }).catch(() => null)
]) : [null, null];
const adrInfo = _adr[0] ?? {};
const adrSpec = _adr[1] ?? {};
await widget('data-table', { columns: ['Méthode', 'Path'], rows: (adrSpec?.endpoints ?? []).map(e => [e.method ?? '—', e.path ?? '—']) });
await widget('code', { language: 'bash', code: `curl '${adrInfo.base_api_url ?? ''}/search/?q=8+rue+de+la+paix+Paris'` });
```

## Common mistakes

- **Pasting the full OpenAPI spec** in `code` — the table summary is enough; only show one or two curl examples.
- **Forgetting auth headers** — many state APIs need an OAuth2 token via DataPass; mention it in the cards section.
- **Hardcoding the base URL** — always use `info.base_api_url`; some APIs migrate domains and the spec lags.
- **Showing every error code** — limit to the 4-5 most actionable ones (401, 403, 404, 429, 503).
- **Not surfacing rate limits** — many APIs enforce 5-30 calls/min; check the spec `x-rate-limit` extensions and warn the user.
