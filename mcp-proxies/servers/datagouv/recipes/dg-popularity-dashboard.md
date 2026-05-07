---
id: dg-popularity-dashboard
name: Popularity dashboard for a dataset
description: Visualize 12-24 months of visits and downloads as a stacked area chart, with stat-cards on totals, peaks and YoY growth, plus a per-file breakdown
when: the user asks how popular a dataset is, how many people use it, or how its usage evolved
servers: [datagouv]
tools_used: [get_dataset_info, get_metrics, list_dataset_resources]
data_type: monthly metrics 12-24 months
components_used: [chart-rich, stat-card, table, kv]
layout:
  type: grid
  columns: 2
  arrangement: full-width chart-rich on top, stats + table + kv below
---

## When to use

The user asks about popularity:
- "Le dataset DVF est-il très consulté ?"
- "Combien de téléchargements pour le RNA cette année ?"
- "Évolution du nombre de visites de ce dataset"
- "Quel fichier de ce dataset est le plus téléchargé ?"

This recipe is great for public communication and inter-agency benchmarking.

## How to use

1. **Fetch info, metrics, resources**:
   ```js
   const dataset_id = '5cc1b94a634f4165e96436c1'; // DVF (fallback example)
   const _all = await Promise.all([
     call('get_dataset_info', { dataset_id }).catch(() => null),
     call('get_metrics', { dataset_id, limit: 24 }).catch(() => ({ metrics: [] })),
     call('list_dataset_resources', { dataset_id }).catch(() => ({ resources: [] }))
   ]);
   const info = _all[0];
   const metrics = _all[1];
   const resList = _all[2];
   if (!info) {
     await widget('text', { content: 'Dataset introuvable ou API indisponible.' });
     return;
   }
   const series = (metrics?.metrics ?? []).slice().reverse(); // chronological
   ```

2. **Compute aggregates**:
   ```js
   const total12 = series.slice(-12).reduce((s, m) => s + (m.monthly_download ?? 0), 0);
   const total12prev = series.slice(-24, -12).reduce((s, m) => s + (m.monthly_download ?? 0), 0);
   const yoy = total12prev ? ((total12 - total12prev) / total12prev * 100).toFixed(1) : 'n/a';
   const peak = series.reduce((p, m) => (m.monthly_download ?? 0) > (p.monthly_download ?? 0) ? m : p, series[0] ?? {});
   ```

3. **Render**:
   ```js
   const I = info;
   if (!series.length) {
     await widget('text', { content: 'Métriques indisponibles pour ce dataset.' });
   } else {
     await widget('chart-rich', {
       type: 'area',
       labels: series.map(x => x.month),
       data: [
         { label: 'Visites', values: series.map(x => x.monthly_visit ?? 0) },
         { label: 'Téléchargements', values: series.map(x => x.monthly_download ?? 0) }
       ]
     });

     await widget('stat-card', { label: 'Téléchargements 12 mois', value: total12.toLocaleString('fr-FR'), icon: 'download' });
     await widget('stat-card', { label: 'Pic mensuel', value: `${(peak.monthly_download ?? 0).toLocaleString('fr-FR')} (${peak.month ?? '—'})`, icon: 'trending-up' });
     await widget('stat-card', { label: 'Évol. YoY', value: `${yoy} %`, icon: 'activity' });
   }

   const fRows = (resList?.resources ?? []).slice(0, 10).map(r => [r.title ?? '—', r.format ?? '—', r.size_human ?? '—']);
   if (!fRows.length) {
     await widget('text', { content: 'Liste des ressources indisponible.' });
   } else {
     await widget('data-table', {
       columns: ['Fichier', 'Format', 'Taille'],
       rows: fRows
     });
   }

   await widget('kv', {
     rows: [
       ['Titre', I.title ?? '—'],
       ['Organisation', I.organization?.name ?? '—'],
       ['Licence', I.license ?? '—'],
       ['Fréquence', I.frequency ?? '—']
     ]
   });
   ```

## Examples

### DVF popularity
```js
const dataset_id = '5cc1b94a634f4165e96436c1';
const metrics = await call('get_metrics', { dataset_id, limit: 24 }).catch(() => ({ metrics: [] }));
const series = (metrics?.metrics ?? []).slice().reverse();
if (!series.length) {
  await widget('text', { content: 'Métriques indisponibles pour ce dataset.' });
} else {
  await widget('chart-rich', {
    type: 'area',
    labels: series.map(m => m.month ?? '—'),
    data: [
      { label: 'Visites', values: series.map(m => m.monthly_visit ?? 0) },
      { label: 'Téléchargements', values: series.map(m => m.monthly_download ?? 0) }
    ]
  });
}
```

### RNA downloads this year
```js
const metrics = await call('get_metrics', { dataset_id: '58e53811c751df03df38f42d', limit: 12 }).catch(() => ({ metrics: [] }));
const series12 = metrics?.metrics ?? [];
if (!series12.length) {
  await widget('text', { content: 'Métriques indisponibles pour ce dataset.' });
} else {
  const total = series12.reduce((s, m) => s + (m.monthly_download ?? 0), 0);
  await widget('stat-card', { label: 'Téléchargements 12 mois', value: total.toLocaleString('fr-FR') });
}
```

## Common mistakes

- **Plotting metrics chronologically when the API returns them reverse-chronologically** — the API lists most recent first; reverse the array before charting.
- **Comparing 12-month windows that overlap** — YoY needs two disjoint 12-month windows (`-24..-12` vs `-12..0`); never reuse months.
- **Missing months** — the API skips months with zero traffic for some datasets; pad the series with zeros to keep the x-axis even.
- **Confusing `monthly_visit` and `monthly_download`** — visits include landing-page hits without files; downloads count actual file fetches.
- **Calling `get_metrics` on the demo environment** — returns empty arrays; production-only.
