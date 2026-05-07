---
id: dg-top-organizations
name: Top organizations producing open data
description: Aggregate the organizations behind search results, render a leaderboard table (datasets count, downloads), profile the top one, and showcase its 5 latest datasets
when: the user wants to see who publishes the most data on data.gouv.fr or to profile a specific producer
servers: [datagouv]
tools_used: [search_datasets, get_dataset_info, get_metrics]
data_type: aggregated producers leaderboard
components_used: [table, profile, stat-card, cards]
layout:
  type: grid
  columns: 2
  arrangement: profile + leaderboard side-by-side, latest cards full-width below
---

## When to use

The user asks about producers:
- "Quelles sont les organisations qui publient le plus de données ?"
- "Profile l'INSEE sur data.gouv"
- "Qui publie sur le thème de la santé ?"
- "Top producteurs de données ouvertes"

This recipe gives an editorial view of the catalog — it valorises producers and enables drill-down.

## How to use

1. **Aggregate orgs from a broad search**:
   ```js
   const res = await call('search_datasets', { query: 'santé', page_size: 50 }).catch(() => ({ datasets: [] }));
   const byOrg = new Map();
   let orgName = '';
   for (const d of (res?.datasets ?? [])) {
     orgName = d.organization?.name ?? '';
     if (!orgName) continue;
     if (!byOrg.has(orgName)) byOrg.set(orgName, { name: orgName, count: 0, latest: [] });
     byOrg.get(orgName).count += 1;
     byOrg.get(orgName).latest.push(d);
   }
   const ranking = [...byOrg.values()].sort((a, b) => b.count - a.count);
   if (ranking.length === 0) {
     await widget('text', { content: 'Aucune organisation trouvée.' });
   }
   ```

2. **Optionally enrich the top org** with metrics on its top dataset:
   ```js
   const topDataset = ranking[0].latest[0];
   const metrics = topDataset ? await call('get_metrics', { dataset_id: topDataset.id, limit: 6 }).catch(() => ({ metrics: [] })) : { metrics: [] };
   const totalDl = (metrics?.metrics ?? []).reduce((s, m) => s + (m.monthly_download ?? 0), 0);
   ```

3. **Render leaderboard, profile and latest cards**:
   ```js
   const top = ranking[0] ?? { name: '—', count: 0, latest: [] };
   await widget('data-table', {
     columns: ['Rang', 'Organisation', 'Datasets'],
     rows: ranking.slice(0, 10).map((o, i) => [i + 1, o.name ?? '—', o.count ?? 0])
   });

   await widget('profile', {
     name: top.name ?? '—',
     fields: [{ label: 'About', value: `${top.count ?? 0} datasets sur ce thème` }]
   });

   await widget('stat-card', { label: 'Téléchargements 6 mois (top dataset)', value: totalDl, icon: 'download' });

   await widget('cards', {
     items: (top.latest ?? []).slice(0, 5).map(d => ({ title: d.title ?? '—', subtitle: d.organization?.name ?? '', description: (d.tags ?? []).slice(0, 4).join(', ') }))
   });
   ```

## Examples

### Top producers on the theme "santé"
```js
const res = await call('search_datasets', { query: 'santé', page_size: 50 }).catch(() => ({ datasets: [] }));
const acc2 = {};
let n2 = '';
for (const d of (res?.datasets ?? [])) {
  n2 = d.organization?.name ?? '';
  if (n2) {
    acc2[n2] = acc2[n2] ?? { name: n2, count: 0 };
    acc2[n2].count += 1;
  }
}
const ranking2 = Object.values(acc2).sort((x, y) => y.count - x.count);
if (ranking2.length === 0) {
  await widget('text', { content: 'Aucune organisation trouvée pour ce thème.' });
} else {
  await widget('data-table', { columns: ['Organisation', 'Datasets'], rows: ranking2.slice(0, 10).map(o => [o.name ?? '—', o.count ?? 0]) });
}
```

### Profile INSEE
```js
const res = await call('search_datasets', { query: 'INSEE', page_size: 50 }).catch(() => ({ datasets: [] }));
const insee = (res?.datasets ?? []).filter(d => (d.organization?.name ?? '').toLowerCase().includes('insee'));
try {
  await widget('profile', { name: 'INSEE', fields: [{ label: 'About', value: `${insee.length} datasets visibles dans cette recherche` }] });
  const cardItems = (insee.length ? insee : (res?.datasets ?? [])).slice(0, 5).map(d => ({ title: d.title ?? '—', subtitle: d.organization?.name ?? '' }));
  if (cardItems.length === 0) {
    await widget('text', { content: 'Aucun dataset trouvé.' });
  } else {
    await widget('cards', { items: cardItems });
  }
} catch (e) {
  await widget('text', { content: 'Impossible de charger le profil INSEE.' });
}
```

## Common mistakes

- **Counting organizations from one search** as if it were a global ranking — the leaderboard is *theme-scoped*; never claim "INSEE has the most datasets on data.gouv" from a 50-result page.
- **Calling `get_metrics` for each of the top 100 datasets** — quota and time bombs; aggregate over `search_datasets` first, then enrich only the top 1-3.
- **Treating slugs as ids** — both work but only the id is stable across renames; store both.
- **Skipping orgs without a logo** — INSEE has one, many ministries do not; use a fallback initials avatar.
- **Confusing producer and re-publisher** — some organizations republish other producers' files; check `info.organization` vs `info.owner`.
