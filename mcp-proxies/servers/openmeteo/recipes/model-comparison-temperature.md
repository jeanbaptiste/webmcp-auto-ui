---
id: model-comparison-temperature
name: Comparer plusieurs modeles meteo (ECMWF/GFS/ICON/Meteo-France)
description: Appels paralleles aux modeles principaux, chart Tmax superpose, table des ecarts, kv consensus/divergence
when: l'utilisateur demande la fiabilite des previsions, l'incertitude au-dela de J+5, "les modeles sont-ils d'accord ?", comparaison ECMWF vs GFS vs ICON
servers: [openmeteo]
tools_used: [geocoding, ecmwf_forecast, gfs_forecast, dwd_icon_forecast, meteofrance_forecast]
data_type: comparison
components_used: [chart-rich, table, kv]
layout:
  type: grid
  columns: 1
  arrangement: chart en haut, table dessous, kv consensus en bas
---

## When to use

- "Les modeles sont-ils d'accord pour Megeve samedi ?"
- "Compare ECMWF et GFS pour Paris"
- "Quelle fiabilite pour la T de J+7 a Bordeaux ?"
- "Y a-t-il un consensus meteo pour le week-end prochain ?"
- "Divergence des modeles pour la canicule annoncee"

Indispensable au-dela de J+5 ou en situation meteo tendue.

## How to use

1. `geocoding({ name, count: 1 })`.
2. Appeler en parallele `ecmwf_forecast`, `gfs_forecast`, `dwd_icon_forecast`, `meteofrance_forecast` avec `daily: [temperature_2m_max]` et `forecast_days: 7`.
3. Calculer pour chaque jour : ecart max entre modeles, modele consensus (mediane).
4. Afficher chart superpose (4 lignes), table des ecarts, kv.

```js
const geo = await call('geocoding', { name: 'Megeve', count: 1 });
const place = geo?.results?.[0];
if (!place) {
  await widget('text', { content: 'Ville introuvable.' });
  return;
}
const { latitude, longitude, timezone } = place;

const args = {
  latitude, longitude, timezone,
  daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum'],
  forecast_days: 7
};

const [ecmwf, gfs, icon, mf] = await Promise.all([
  call('ecmwf_forecast', args).catch(() => null),
  call('gfs_forecast', args).catch(() => null),
  call('dwd_icon_forecast', args).catch(() => null),
  call('meteofrance_forecast', args).catch(() => null)
]);

const models = [
  { name: 'ECMWF', data: ecmwf, color: '#e74c3c' },
  { name: 'GFS', data: gfs, color: '#3498db' },
  { name: 'ICON', data: icon, color: '#27ae60' },
  { name: 'Meteo-France', data: mf, color: '#9b59b6' }
].filter(m => m.data?.daily?.time?.length);

if (models.length === 0) {
  await widget('text', { content: 'Aucun modele disponible.' });
  return;
}

const days = models[0].data.daily.time ?? [];
const spreads = days.map((_, i) => {
  const vals = models.map(m => m.data.daily.temperature_2m_max?.[i]).filter(v => Number.isFinite(v));
  if (vals.length < 2) return 0;
  return Math.max(...vals) - Math.min(...vals);
});

const maxSpread = spreads.length > 0 ? Math.max(...spreads) : 0;
const verdict = maxSpread < 2 ? 'Forte concordance' : maxSpread < 4 ? 'Concordance moyenne' : 'Forte divergence';

await widget('chart-rich', {
  title: 'Tmax 7j - modeles compares',
  type: 'line',
  labels: days,
  data: models.map(m => ({ label: m.name, values: m.data.daily.temperature_2m_max ?? [], color: m.color }))
});

await widget('data-table', {
  title: 'Ecart max entre modeles (C)',
  columns: ['Date', 'Spread Tmax', 'Min', 'Max'],
  rows: days.map((t, i) => {
    const vals = models.map(m => m.data.daily.temperature_2m_max?.[i]).filter(v => Number.isFinite(v));
    if (vals.length === 0) return [t, '—', '—', '—'];
    return [t, spreads[i].toFixed(1), Math.min(...vals).toFixed(1), Math.max(...vals).toFixed(1)];
  })
});

const idxMax = spreads.indexOf(maxSpread);
await widget('kv', {
  title: 'Consensus',
  rows: [
    ['Verdict', verdict],
    ['Ecart max sur 7j', `${maxSpread.toFixed(1)} C`],
    ['Jour le plus incertain', idxMax >= 0 ? (days[idxMax] ?? '—') : '—']
  ]
});
```

## Examples

### Megeve samedi prochain
Pipeline ci-dessus. Si `maxSpread > 4`, signaler dans le kv que le ski/randonnee doit etre flexible.

### Comparaison sur Tokyo (modeles asiatiques)
Remplacer `meteofrance_forecast` par `jma_forecast` ; pertinent en Asie.

## Common mistakes

- TOUJOURS utiliser `Promise.all` -- 4 appels sequentiels = ~4s, paralleles = ~1s
- Ne pas comparer des modeles a horizons differents -- toujours meme `forecast_days`
- Les modeles n'ont pas tous la meme couverture geographique : `meteofrance_forecast` est moins fiable en Asie, `jma_forecast` peu pertinent en Europe
- Ne pas confondre `ensemble_forecast` (membres d'un seul modele) avec multi-modeles (modeles distincts)
- Toujours afficher l'ecart en valeur absolue (C), pas en pourcentage (sans sens pour des temperatures)
- Si un modele renvoie une erreur (timeout, hors couverture), traiter avec un fallback plutot que crasher
