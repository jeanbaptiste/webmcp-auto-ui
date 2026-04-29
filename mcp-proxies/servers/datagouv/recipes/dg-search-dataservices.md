---
id: dg-search-dataservices
name: Catalog of public APIs (dataservices)
description: Search the data.gouv.fr dataservices catalog (third-party APIs), render org+title cards, a table with license and OpenAPI availability, and stat-cards
when: the user wants an official public API rather than a static dataset
servers: [datagouv]
tools_used: [search_dataservices, get_dataservice_info]
data_type: API catalog
components_used: [cards, table, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: cards top, table + stats below
---

## When to use

The user is looking for a programmatic data source:
- "Quelles APIs publiques existent pour la SIRENE ?"
- "Trouve-moi une API officielle pour les codes postaux"
- "Y a-t-il une API pour les associations RNA ?"
- "Liste-moi les APIs DGFiP disponibles"

`dataservices` lists official APIs (DILA, INSEE, DGFiP, IGN, ANTS…) — under-discovered compared to static datasets.

## How to use

1. **Search the dataservices catalog**:
   ```js
   const res = await call('search_dataservices', { query: 'sirene', page_size: 20 });
   const services = res.dataservices ?? [];
   ```

2. **Render**:
   ```js
   await widget('cards', {
     items: services.map(s => ({
       title: s.title,
       subtitle: s.organization?.name,
       description: (s.description ?? '').slice(0, 180),
       href: s.base_api_url,
       badge: s.machine_documentation_url ? 'OpenAPI' : 'sans spec'
     }))
   });

   await widget('table', {
     columns: ['API', 'Org.', 'Licence', 'OpenAPI', 'MAJ'],
     rows: services.map(s => [s.title, s.organization?.name, s.license, s.machine_documentation_url ? '✓' : '—', s.last_modified])
   });

   const withSpec = services.filter(s => s.machine_documentation_url).length;
   await widget('stat-card', { label: 'APIs', value: services.length, icon: 'cloud' });
   await widget('stat-card', { label: 'Avec OpenAPI', value: `${withSpec}/${services.length}`, icon: 'file-code' });
   await widget('stat-card', { label: 'Organisations', value: new Set(services.map(s => s.organization?.id)).size, icon: 'building' });
   ```

## Examples

### Find SIRENE APIs
```js
const res = await call('search_dataservices', { query: 'sirene', page_size: 10 });
await widget('cards', { items: res.dataservices.map(s => ({ title: s.title, subtitle: s.organization?.name, href: s.base_api_url })) });
```

### Find an address API
```js
const res = await call('search_dataservices', { query: 'adresse', page_size: 10 });
await widget('table', { columns: ['API', 'Org.', 'OpenAPI'], rows: res.dataservices.map(s => [s.title, s.organization?.name, s.machine_documentation_url ? '✓' : '—']) });
```

### Postal codes API
```js
const res = await call('search_dataservices', { query: 'code postal', page_size: 10 });
await widget('cards', { items: res.dataservices.map(s => ({ title: s.title, subtitle: s.organization?.name, description: s.description?.slice(0, 200) })) });
```

## Common mistakes

- **Confusing dataservices and datasets** — the SIRENE *file* is in `search_datasets`, the SIRENE *API* is in `search_dataservices`. Use the right tool.
- **Quoting `base_api_url` as the user-facing URL** — most APIs require an API key; surface the registration URL from the dataservice description.
- **Trusting `machine_documentation_url` blindly** — some entries point to a dead link; fall back to `get_dataservice_info` and ultimately `get_dataservice_openapi_spec`.
- **Counting "APIs" by org** — some orgs register multiple APIs that share the same backend (v1, v2, v3); dedupe by base URL if needed.
- **Forgetting AND-logic** — a query like `"API SIRENE entreprise"` returns nothing; keep the keyword set short.
