---
id: model-selector-forecast
name: Previsions selon un modele meteo specifique (ECMWF, GFS, ICON, Meteo-France, JMA, Met.no, GEM)
description: Recette generique parametree par le nom du modele, dispatche vers le tool provider correspondant et rend chart + KPIs + metadonnees
when: l'utilisateur demande explicitement un modele meteo nomme (ECMWF, GFS, ICON, Meteo-France, JMA, Met.no, GEM), usage expert/meteorologie amateur
servers: [openmeteo]
tools_used: [geocoding, ecmwf_forecast, gfs_forecast, dwd_icon_forecast, meteofrance_forecast, jma_forecast, metno_forecast, gem_forecast]
data_type: timeseries
components_used: [chart-rich, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: chart pleine largeur, stat-cards + kv (metadonnees modele) dessous
---

## When to use

- "Donne-moi les previsions pour Tokyo selon le modele JMA"
- "Meteo Paris selon Meteo-France uniquement"
- "Previsions ECMWF pour Berlin"
- "J'aimerais le modele americain GFS pour New York"
- "Previsions Met.no pour Oslo"

Quand l'utilisateur ne nomme pas de modele : utiliser plutot la recette generique `weekly-forecast-rich`.

## How to use

1. `geocoding({ name, count: 1 })`.
2. Mapper le nom du modele vers le tool : `ecmwf` -> `ecmwf_forecast`, `gfs` -> `gfs_forecast`, `icon`/`dwd` -> `dwd_icon_forecast`, `meteofrance` -> `meteofrance_forecast`, `jma` -> `jma_forecast`, `metno` -> `metno_forecast`, `gem` -> `gem_forecast`.
3. Appeler le tool selectionne avec `daily` (Tmin/Tmax/precip/wind) sur 7 jours.
4. Rendre chart + stat-cards + kv (origine, resolution typique).

```js
const modelMap = {
  ecmwf: { tool: 'ecmwf_forecast', label: 'ECMWF (Europe)', resolution: '~9 km' },
  gfs: { tool: 'gfs_forecast', label: 'GFS (NOAA, USA)', resolution: '~13 km' },
  icon: { tool: 'dwd_icon_forecast', label: 'ICON (DWD, Allemagne)', resolution: '~6.5 km' },
  meteofrance: { tool: 'meteofrance_forecast', label: 'Meteo-France AROME', resolution: '~1.3 km' },
  jma: { tool: 'jma_forecast', label: 'JMA (Japon)', resolution: '~5 km' },
  metno: { tool: 'metno_forecast', label: 'MET Norway', resolution: '~2.5 km' },
  gem: { tool: 'gem_forecast', label: 'GEM (Canada)', resolution: '~10 km' }
};

const userModel = 'jma'; // resolu depuis la requete utilisateur
const m = modelMap[userModel];

const geo = await call('geocoding', { name: 'Tokyo', count: 1 });
const { latitude, longitude, timezone } = geo.results[0];

const w = await call(m.tool, {
  latitude, longitude, timezone,
  daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'wind_speed_10m_max'],
  forecast_days: 7
});

await widget('chart-rich', {
  title: `Previsions Tokyo - ${m.label}`,
  type: 'line',
  xAxis: { label: 'Date', data: w.daily.time },
  series: [
    { label: 'Tmax (C)', data: w.daily.temperature_2m_max, color: '#e74c3c' },
    { label: 'Tmin (C)', data: w.daily.temperature_2m_min, color: '#3498db' }
  ]
});

await widget('stat-card', {
  items: [
    { label: 'Tmax 7j', value: `${Math.max(...w.daily.temperature_2m_max)}C` },
    { label: 'Tmin 7j', value: `${Math.min(...w.daily.temperature_2m_min)}C` },
    { label: 'Pluie totale', value: `${w.daily.precipitation_sum.reduce((a,b)=>a+b,0).toFixed(1)} mm` }
  ]
});

await widget('kv', {
  title: 'Modele utilise',
  pairs: [
    ['Nom', m.label],
    ['Resolution typique', m.resolution],
    ['Tool MCP', m.tool]
  ]
});
```

## Examples

### Berlin selon ICON
`userModel = 'icon'` ; ICON-DWD est tres pertinent en Europe centrale.

### Oslo selon Met.no
`userModel = 'metno'` ; MET Norway a la meilleure couverture Scandinavie.

## Common mistakes

- Ne pas appeler tous les modeles "au cas ou" -- une seule recette = un seul modele (sinon utiliser `model-comparison-temperature`)
- Verifier que le modele est pertinent pour la zone : Meteo-France hors France = degradation, JMA hors Asie = degradation
- Si le mapping ne trouve pas le modele -> fallback sur `weather_forecast` generique avec un warning
- Ne pas oublier d'afficher dans le kv le nom du modele effectivement utilise -- l'utilisateur peut avoir tape "europeen" et il faut clarifier
- Tous ces tools ont les memes parametres que `weather_forecast` -- pas besoin de re-mapper les arguments
- Resolution variable selon zone : la valeur kv est indicative, pas garantie partout
