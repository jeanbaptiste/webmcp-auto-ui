---
id: dg-dataset-profile
name: Dataset profile with files and usage metrics
description: Full profile view of a dataset — description text, table of files (format, size, MAJ), stat-cards on 30-day visits/downloads, timeline of last updates
when: the user has a dataset id and wants a one-glance overview before diving into a specific resource
servers: [datagouv]
tools_used: [get_dataset_info, list_dataset_resources, get_metrics]
data_type: dataset metadata + monthly metrics
components_used: [text, table, stat-card, timeline]
layout:
  type: grid
  columns: 2
  arrangement: text + stats top, table + timeline bottom
---

## When to use

The user wants a full profile of a single dataset:
- "Donne-moi tout sur le dataset DVF (Demandes de valeurs foncières)"
- "Détaille ce jeu de données INSEE"
- "Profil complet du RNA"
- "Que contient le dataset des subventions associatives ?"

This recipe condenses metadata + files + popularity into a single view so the user can decide which resource to open next.

## How to use

1. **Fetch dataset metadata, resources and metrics in parallel**:
   ```js
   const [info, resList, metrics] = await Promise.all([
     call('get_dataset_info', { dataset_id }).catch(() => null),
     call('list_dataset_resources', { dataset_id }).catch(() => ({ resources: [] })),
     call('get_metrics', { dataset_id, limit: 12 }).catch(() => ({ metrics: [] }))
   ]);
   if (!info) {
     await widget('text', { content: 'Dataset introuvable.' });
     return;
   }
   ```

2. **Render the profile**:
   ```js
   await widget('text', {
     title: info.title ?? '—',
     subtitle: info.organization?.name ?? '',
     content: info.description ?? ''
   });

   const last30 = (metrics?.metrics ?? [])[0] ?? {};
   await widget('stat-card', { label: 'Visites 30j', value: last30.monthly_visit ?? 0, icon: 'eye' });
   await widget('stat-card', { label: 'Téléchargements 30j', value: last30.monthly_download ?? 0, icon: 'download' });
   await widget('stat-card', { label: 'Fichiers', value: resList?.resources?.length ?? 0, icon: 'file' });
   await widget('stat-card', { label: 'Licence', value: info.license ?? '—', icon: 'shield' });

   await widget('table', {
     columns: ['Titre', 'Format', 'Taille', 'MAJ'],
     rows: (resList?.resources ?? []).map(r => [r.title ?? '—', r.format ?? '—', r.size_human ?? r.filesize ?? '—', r.last_modified ?? '—'])
   });

   await widget('timeline', {
     items: (metrics?.metrics ?? []).map(m => ({
       date: m.month ?? '—',
       label: `${m.monthly_visit ?? 0} visites · ${m.monthly_download ?? 0} téléchargements`
     }))
   });
   ```

## Examples

### DVF — Demandes de valeurs foncières (DGFiP)
```js
const dataset_id = '5cc1b94a634f4165e96436c1';
const [info, resList, metrics] = await Promise.all([
  call('get_dataset_info', { dataset_id }).catch(() => null),
  call('list_dataset_resources', { dataset_id }).catch(() => ({ resources: [] })),
  call('get_metrics', { dataset_id, limit: 12 }).catch(() => ({ metrics: [] }))
]);
if (!info) { await widget('text', { content: 'Dataset introuvable.' }); return; }
await widget('text', { title: info.title ?? '—', content: info.description ?? '' });
await widget('stat-card', { label: 'Téléchargements 30j', value: metrics?.metrics?.[0]?.monthly_download ?? 0 });
await widget('table', { columns: ['Titre', 'Format', 'Taille'], rows: (resList?.resources ?? []).map(r => [r.title ?? '—', r.format ?? '—', r.size_human ?? '—']) });
```

### RNA — Répertoire national des associations
```js
const dataset_id = '58e53811c751df03df38f42d';
const info = await call('get_dataset_info', { dataset_id }).catch(() => null);
const resList = await call('list_dataset_resources', { dataset_id }).catch(() => ({ resources: [] }));
if (!info) { await widget('text', { content: 'Dataset introuvable.' }); return; }
await widget('text', { title: info.title ?? '—', subtitle: info.organization?.name ?? '', content: info.description ?? '' });
await widget('table', { columns: ['Fichier', 'Format', 'MAJ'], rows: (resList?.resources ?? []).map(r => [r.title ?? '—', r.format ?? '—', r.last_modified ?? '—']) });
```

## Common mistakes

- **Hardcoding `dataset_id`** when the user gave a slug — both work (`dvf` and `5cc1b94a634f4165e96436c1` resolve to the same dataset), but be explicit so the URL stays stable.
- **Calling `get_metrics` on the demo environment** — it returns empty arrays; production-only.
- **Showing every resource** — DVF has 100+ yearly archives; cap the table to the latest 10 and link out for the rest.
- **Forgetting the license** — always surface `info.license` (often `lov2` or `etalab-2.0`) so the downstream user knows the reuse terms.
- **Truncating the description silently** — long descriptions contain critical methodological notes; keep `text` widget without aggressive slicing.
