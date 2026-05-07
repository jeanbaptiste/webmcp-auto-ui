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
   const id_a = '5cc1b94a634f4165e96436c1'; // DVF
   const id_b = '58e53811c751df03df38f42d'; // RNA
   const _all = await Promise.all([
     call('get_dataset_info', { dataset_id: id_a }).catch(() => null),
     call('get_dataset_info', { dataset_id: id_b }).catch(() => null),
     call('list_dataset_resources', { dataset_id: id_a }).catch(() => ({ resources: [] })),
     call('list_dataset_resources', { dataset_id: id_b }).catch(() => ({ resources: [] })),
     call('get_metrics', { dataset_id: id_a, limit: 12 }).catch(() => ({ metrics: [] })),
     call('get_metrics', { dataset_id: id_b, limit: 12 }).catch(() => ({ metrics: [] }))
   ]);
   const a = _all[0];
   const b = _all[1];
   const resA = _all[2];
   const resB = _all[3];
   const mA = _all[4];
   const mB = _all[5];
   if (!a || !b) {
     await widget('text', { content: 'Un ou les deux datasets sont introuvables.' });
   }
   ```

2. **Render side-by-side**:
   ```js
   const A = a ?? {};
   const B = b ?? {};
   await widget('cards', {
     items: [
       { title: A.title ?? '—', subtitle: A.organization?.name ?? '', description: A.description?.slice(0, 200) ?? '' },
       { title: B.title ?? '—', subtitle: B.organization?.name ?? '', description: B.description?.slice(0, 200) ?? '' }
     ]
   });

   const labelA = (A.title ?? 'A').slice(0, 20);
   const labelB = (B.title ?? 'B').slice(0, 20);
   await widget('kv', {
     title: `${labelA} vs ${labelB}`,
     rows: [
       ['Licence A', A.license ?? '—'],
       ['Licence B', B.license ?? '—'],
       ['Fréquence A', A.frequency ?? '—'],
       ['Fréquence B', B.frequency ?? '—'],
       ['Fichiers A', String(resA?.resources?.length ?? 0)],
       ['Fichiers B', String(resB?.resources?.length ?? 0)],
       ['Créé A', A.created ?? '—'],
       ['Créé B', B.created ?? '—'],
       ['MAJ A', A.last_modified ?? '—'],
       ['MAJ B', B.last_modified ?? '—']
     ]
   });

   const dlA = (mA?.metrics ?? []).reduce((s, x) => s + (x.monthly_download ?? 0), 0);
   const dlB = (mB?.metrics ?? []).reduce((s, x) => s + (x.monthly_download ?? 0), 0);
   if (dlA || dlB) {
     await widget('chart', {
       title: 'Téléchargements 12 mois',
       bars: [[A.title ?? 'A', Number(dlA)], [B.title ?? 'B', Number(dlB)]]
     });
   } else {
     await widget('text', { content: 'Données de téléchargement indisponibles.' });
   }

   const tagsA = new Set(A.tags ?? []);
   const tagsB = new Set(B.tags ?? []);
   const allTags = [...new Set([...tagsA, ...tagsB])];
   await widget('data-table', {
     columns: ['Tag', 'Dataset A', 'Dataset B'],
     rows: allTags.length ? allTags.map(t => [t, tagsA.has(t) ? '✓' : '—', tagsB.has(t) ? '✓' : '—']) : [['—', '—', '—']]
   });
   ```

## Examples

### DVF vs RNA, basic info
```js
const _ex1 = await Promise.all([
  call('get_dataset_info', { dataset_id: '5cc1b94a634f4165e96436c1' }).catch(() => null), // DVF
  call('get_dataset_info', { dataset_id: '58e53811c751df03df38f42d' }).catch(() => null)  // RNA
]);
const ex_a = _ex1[0] ?? {};
const ex_b = _ex1[1] ?? {};
await widget('cards', { items: [{ title: ex_a.title ?? '—', subtitle: ex_a.organization?.name ?? '' }, { title: ex_b.title ?? '—', subtitle: ex_b.organization?.name ?? '' }] });
await widget('kv', { rows: [['Licence A', ex_a.license ?? '—'], ['Licence B', ex_b.license ?? '—'], ['Fréquence A', ex_a.frequency ?? '—'], ['Fréquence B', ex_b.frequency ?? '—']] });
```

### DVF vs RNA, downloads
```js
const _ex2 = await Promise.all([
  call('get_dataset_info', { dataset_id: '5cc1b94a634f4165e96436c1' }).catch(() => null),
  call('get_dataset_info', { dataset_id: '58e53811c751df03df38f42d' }).catch(() => null)
]);
const ex2_a = _ex2[0] ?? {};
const ex2_b = _ex2[1] ?? {};
const _m = await Promise.all([
  ex2_a.id ? call('get_metrics', { dataset_id: ex2_a.id, limit: 12 }).catch(() => ({ metrics: [] })) : { metrics: [] },
  ex2_b.id ? call('get_metrics', { dataset_id: ex2_b.id, limit: 12 }).catch(() => ({ metrics: [] })) : { metrics: [] }
]);
const ex2_mA = _m[0];
const ex2_mB = _m[1];
const ex2_dlA = (ex2_mA?.metrics ?? []).reduce((s, x) => s + (x.monthly_download ?? 0), 0);
const ex2_dlB = (ex2_mB?.metrics ?? []).reduce((s, x) => s + (x.monthly_download ?? 0), 0);
if (ex2_dlA || ex2_dlB) {
  await widget('chart', { bars: [[ex2_a.title ?? 'A', Number(ex2_dlA)], [ex2_b.title ?? 'B', Number(ex2_dlB)]] });
} else {
  await widget('text', { content: 'Données de téléchargement indisponibles.' });
}
```

## Common mistakes

- **Comparing apples to oranges** — INSEE pauvreté monétaire ≠ DREES pauvreté en conditions de vie; surface the methodological scope from each description.
- **Ignoring update frequency** — a yearly dataset and a monthly one cannot be ranked by raw download count.
- **Treating `field name match` as semantic match** — `revenu` in dataset A may be net while in dataset B it is gross; flag this in the kv view.
- **Picking one as "the winner"** — the recipe is descriptive; never recommend without telling the user what trade-off the choice implies.
- **Skipping the license check** — same indicator under `lov2` vs `etalab-2.0` vs proprietary changes downstream reuse rights.
