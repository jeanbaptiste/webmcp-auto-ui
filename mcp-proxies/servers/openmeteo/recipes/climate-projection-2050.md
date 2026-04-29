---
id: climate-projection-2050
name: Projection climatique locale (CMIP6) selon scenarios SSP
description: Chart Tmoy 2025-2100 selon SSP1-2.6 / SSP2-4.5 / SSP5-8.5, table derives decennales, texte contextuel
when: l'utilisateur demande le climat futur d'une ville, "rechauffement local", "climat de X en 2050", scenarios CMIP6 ou GIEC
servers: [openmeteo]
tools_used: [geocoding, climate_projection]
data_type: climate
components_used: [chart-rich, table, text]
layout:
  type: grid
  columns: 1
  arrangement: chart pleine largeur 100 ans, table dessous, texte explicatif en bas
---

## When to use

- "A quoi ressemblera le climat de Marseille en 2070 ?"
- "Rechauffement local a Bordeaux d'ici 2050"
- "Comparer scenarios SSP a Lille"
- "Combien de degres en plus a Paris en 2100 ?"
- "Climat futur Toulouse selon le GIEC"

Pedagogique : sensibilise au rechauffement LOCAL (qui peut etre superieur au global).

## How to use

1. `geocoding({ name, count: 1 })`.
2. `climate_projection` avec `daily: [temperature_2m_mean, precipitation_sum]`, `start_date: '2025-01-01'`, `end_date: '2100-12-31'`, et un ou plusieurs `models` couvrant les SSP (`MRI_AGCM3_2_S`, `EC_Earth3P_HR`, `CMCC_CM2_VHR4`, `MPI_ESM1_2_XR`).
3. Resampler en moyennes annuelles (eviter 27000+ points sur le chart).
4. Calculer derives par decennie 2030-2100.
5. Rendre chart 1 ligne par scenario (si dispo via models), table derives, texte explicatif.

```js
const geo = await call('geocoding', { name: 'Marseille', count: 1 });
const { latitude, longitude } = geo.results[0];

const c = await call('climate_projection', {
  latitude, longitude,
  daily: ['temperature_2m_mean'],
  start_date: '2025-01-01',
  end_date: '2100-12-31',
  models: ['EC_Earth3P_HR', 'MRI_AGCM3_2_S', 'CMCC_CM2_VHR4']
});

// Resample en moyenne annuelle
function annualize(times, values) {
  const byYear = {};
  times.forEach((t, i) => {
    const y = t.slice(0, 4);
    (byYear[y] = byYear[y] || []).push(values[i]);
  });
  return Object.entries(byYear).map(([y, arr]) => ({ year: +y, mean: arr.reduce((a,b)=>a+b,0)/arr.length }));
}

const annual = annualize(c.daily.time, c.daily.temperature_2m_mean);
const baseline = annual.slice(0, 10).reduce((a, b) => a + b.mean, 0) / 10;

const decades = [2030, 2050, 2070, 2090].map(d => {
  const slice = annual.filter(a => a.year >= d && a.year < d + 10);
  const m = slice.reduce((a, b) => a + b.mean, 0) / slice.length;
  return { decade: `${d}-${d+9}`, tMean: m.toFixed(2), delta: (m - baseline).toFixed(2) };
});

await widget('chart-rich', {
  title: 'Temperature moyenne annuelle - Marseille (2025-2100)',
  type: 'line',
  xAxis: { label: 'Annee', data: annual.map(a => a.year) },
  series: [{ label: 'Tmoy annuelle (C)', data: annual.map(a => a.mean), color: '#e74c3c' }]
});

await widget('table', {
  title: 'Derive par decennie vs 2025-2034',
  columns: ['Decennie', 'Tmoy (C)', 'Delta (+ C)'],
  rows: decades.map(d => [d.decade, d.tMean, `+${d.delta}`])
});

await widget('text', {
  content: `Les projections CMIP6 reposent sur des scenarios socio-economiques (SSP). SSP1-2.6 = neutralite carbone ~2070, SSP2-4.5 = trajectoire actuelle, SSP5-8.5 = poursuite intensive des fossiles. La derive locale peut depasser la moyenne globale (effet d'amplification continentale et mediterraneenne).`
});
```

## Examples

### Bordeaux 2050 vs 2100
Filtrer `decades` sur `[2050, 2090]` ; afficher uniquement 2 lignes pour focus journalistique.

### Comparaison Marseille / Strasbourg
Lancer 2 fois le pipeline en `Promise.all`, superposer 2 series sur le chart.

## Common mistakes

- Ne PAS afficher tous les jours bruts (27000+ points) -- toujours resampler en annuel ou decennie
- Le tool `models` ici designe des modeles climatiques CMIP6, pas des modeles meteo (ECMWF/GFS/ICON)
- La projection n'est pas une "prevision" -- c'est un scenario conditionnel a une trajectoire d'emissions
- Toujours montrer plusieurs scenarios SSP cote a cote -- un seul donne l'illusion de certitude
- L'anomalie locale peut differer de l'anomalie globale (zones polaires +3x, Mediterranee +1.5x global)
- Utiliser une baseline explicite (1991-2020 ou debut de serie) -- sans baseline, les derives ne veulent rien dire
