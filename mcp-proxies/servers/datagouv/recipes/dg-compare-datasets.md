---
id: dg-compare-datasets
name: Compare two datasets on the same theme
description: Side-by-side comparison of two datasets — cards, key-value metadata diff, downloads bar chart, table of overlapping fields
when: the user wants to choose between two datasets that look like they cover the same topic
servers: [datagouv]
tools_used: [search_datasets, get_dataset_info, list_dataset_resources, get_metrics]
data_type: side-by-side dataset comparison
components_used: [cards, table, chart, kv]
layout:
  type: grid
  columns: 2
  arrangement: cards side-by-side, kv + chart + table below
---

## When to use

The user is hesitating between two datasets:
- "Compare deux datasets sur la consommation d'énergie"
- "Quel jeu de données choisir pour la pauvreté ? INSEE ou ministère ?"
- "Différence entre le dataset SIRENE et SIRENE-V3"
- "Compare les deux versions du fichier des élections"

Open data has a lot of overlap — this recipe helps the user pick.

## How to use

1. **Fetch both profiles in parallel**:
   ```js
   const [a, b, resA, resB, mA, mB] = await Promise.all([
     call('get_dataset_info', { dataset_id: id_a }).catch(() => null),
     call('get_dataset_info', { dataset_id: id_b }).catch(() => null),
     call('list_dataset_resources', { dataset_id: id_a }).catch(() => ({ resources: [] })),
     call('list_dataset_resources', { dataset_id: id_b }).catch(() => ({ resources: [] })),
     call('get_metrics', { dataset_id: id_a, limit: 12 }).catch(() => ({ metrics: [] })),
     call('get_metrics', { dataset_id: id_b, limit: 12 }).catch(() => ({ metrics: [] }))
   ]);
   if (!a || !b) {
     await widget('text', { content: 'Un ou les deux datasets sont introuvables.' });
     return;
   }
   ```

2. **Render side-by-side**:
   ```js
   await widget('cards', {
     items: [
       { title: a.title ?? '—', subtitle: a.organization?.name ?? '', description: a.description?.slice(0, 200) ?? '' },
       { title: b.title ?? '—', subtitle: b.organization?.name ?? '', description: b.description?.slice(0, 200) ?? '' }
     ]
   });

   await widget('kv', {
     items: [
       { key: 'Licence', valueA: a.license ?? '—', valueB: b.license ?? '—' },
       { key: 'Fréquence', valueA: a.frequency ?? '—', valueB: b.frequency ?? '—' },
       { key: 'Fichiers', valueA: resA?.resources?.length ?? 0, valueB: resB?.resources?.length ?? 0 },
       { key: 'Créé', valueA: a.created_at ?? '—', valueB: b.created_at ?? '—' },
       { key: 'MAJ', valueA: a.last_modified ?? '—', valueB: b.last_modified ?? '—' }
     ]
   });

   const dlA = (mA?.metrics ?? []).reduce((s, m) => s + (m.monthly_download ?? 0), 0);
   const dlB = (mB?.metrics ?? []).reduce((s, m) => s + (m.monthly_download ?? 0), 0);
   await widget('chart', {
     type: 'bar',
     data: { labels: [a.title ?? 'A', b.title ?? 'B'], values: [dlA, dlB] },
     options: { yLabel: 'Téléchargements 12 mois' }
   });

   const fieldsA = new Set((resA?.resources ?? []).flatMap(r => r.schema?.fields?.map(f => f.name) ?? []));
   const fieldsB = new Set((resB?.resources ?? []).flatMap(r => r.schema?.fields?.map(f => f.name) ?? []));
   const all = [...new Set([...fieldsA, ...fieldsB])];
   await widget('table', {
     columns: ['Champ', 'Dataset A', 'Dataset B'],
     rows: all.map(f => [f, fieldsA.has(f) ? '✓' : '—', fieldsB.has(f) ? '✓' : '—'])
   });
   ```

## Examples

### INSEE vs DREES on poverty
```js
const [a, b] = await Promise.all([
  call('get_dataset_info', { dataset_id: '<insee-pauvrete-id>' }).catch(() => null),
  call('get_dataset_info', { dataset_id: '<drees-pauvrete-id>' }).catch(() => null)
]);
if (!a || !b) { await widget('text', { content: 'Datasets introuvables.' }); return; }
await widget('cards', { items: [{ title: a.title ?? '—', subtitle: a.organization?.name ?? '' }, { title: b.title ?? '—', subtitle: b.organization?.name ?? '' }] });
await widget('kv', { items: [{ key: 'Licence', valueA: a.license ?? '—', valueB: b.license ?? '—' }, { key: 'Fréquence', valueA: a.frequency ?? '—', valueB: b.frequency ?? '—' }] });
```

### Two versions of energy consumption
```js
const [a, b] = await Promise.all([
  call('get_dataset_info', { dataset_id: '<rte-conso-id>' }).catch(() => null),
  call('get_dataset_info', { dataset_id: '<sdes-conso-id>' }).catch(() => null)
]);
if (!a || !b) { await widget('text', { content: 'Datasets introuvables.' }); return; }
const [mA, mB] = await Promise.all([
  call('get_metrics', { dataset_id: a.id, limit: 12 }).catch(() => ({ metrics: [] })),
  call('get_metrics', { dataset_id: b.id, limit: 12 }).catch(() => ({ metrics: [] }))
]);
await widget('chart', { type: 'bar', data: { labels: [a.title ?? 'A', b.title ?? 'B'], values: [mA?.metrics?.[0]?.monthly_download ?? 0, mB?.metrics?.[0]?.monthly_download ?? 0] } });
```

## Common mistakes

- **Comparing apples to oranges** — INSEE pauvreté monétaire ≠ DREES pauvreté en conditions de vie; surface the methodological scope from each description.
- **Ignoring update frequency** — a yearly dataset and a monthly one cannot be ranked by raw download count.
- **Treating `field name match` as semantic match** — `revenu` in dataset A may be net while in dataset B it is gross; flag this in the kv view.
- **Picking one as "the winner"** — the recipe is descriptive; never recommend without telling the user what trade-off the choice implies.
- **Skipping the license check** — same indicator under `lov2` vs `etalab-2.0` vs proprietary changes downstream reuse rights.
