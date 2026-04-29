---
id: historical-archive-year
name: Meteo historique d'une periode passee (ERA5 1940+)
description: Chart Tmoy/Tmax sur la periode demandee, stat-cards records, kv metadonnees source
when: l'utilisateur demande la meteo d'une annee/saison passee, "ete 1976", "comparer 2003 et 2025", canicule historique, recherche climat
servers: [openmeteo]
tools_used: [geocoding, weather_archive]
data_type: timeseries
components_used: [chart-rich, stat-card, kv]
layout:
  type: grid
  columns: 2
  arrangement: chart pleine largeur, stat-cards et kv dessous
---

## When to use

- "Compare l'ete 2003 et l'ete 1976 a Lyon"
- "Meteo de la canicule d'aout 2003 a Paris"
- "T moyenne en mai 1968 a Toulouse"
- "Hiver 1956 a Strasbourg"
- "Comment etait l'ete dernier a Bordeaux ?"

Recherche climat, journalisme, memoire meteo, etudes regionales.

## How to use

1. `geocoding({ name, count: 1 })`.
2. `weather_archive` avec `start_date`, `end_date` (format YYYY-MM-DD), `daily: [temperature_2m_max, temperature_2m_min, temperature_2m_mean, precipitation_sum]`.
3. Calculer records (Tmax absolu, jours > seuil), totaux pluie, moyenne periode.
4. Rendre chart, stat-cards, kv (source, periode, nb jours).

```js
const geo = await call('geocoding', { name: 'Lyon', count: 1 });
const { latitude, longitude, timezone } = geo.results[0];

const a = await call('weather_archive', {
  latitude, longitude, timezone,
  start_date: '2003-06-01',
  end_date: '2003-08-31',
  daily: ['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean', 'precipitation_sum']
});

const tmax = a.daily.temperature_2m_max;
const recordIdx = tmax.indexOf(Math.max(...tmax));
const heatDays = tmax.filter(t => t > 35).length;
const meanT = a.daily.temperature_2m_mean.reduce((s, v) => s + v, 0) / a.daily.temperature_2m_mean.length;
const totalRain = a.daily.precipitation_sum.reduce((s, v) => s + v, 0);

await widget('chart-rich', {
  title: 'Ete 2003 - Lyon (archive ERA5)',
  type: 'line',
  xAxis: { label: 'Date', data: a.daily.time },
  series: [
    { label: 'Tmax (C)', data: tmax, color: '#e74c3c' },
    { label: 'Tmin (C)', data: a.daily.temperature_2m_min, color: '#3498db' },
    { label: 'Tmoy (C)', data: a.daily.temperature_2m_mean, color: '#2c3e50' }
  ]
});

await widget('stat-card', {
  items: [
    { label: 'Tmax absolu', value: `${tmax[recordIdx]}C le ${a.daily.time[recordIdx]}`, icon: 'thermometer' },
    { label: 'Jours > 35C', value: String(heatDays), icon: 'flame' },
    { label: 'Tmoy periode', value: `${meanT.toFixed(2)}C`, icon: 'trending-up' },
    { label: 'Pluie totale', value: `${totalRain.toFixed(0)} mm`, icon: 'cloud-rain' }
  ]
});

await widget('kv', {
  pairs: [
    ['Source', 'ERA5 (Copernicus / ECMWF)'],
    ['Periode', `${a.daily.time[0]} -> ${a.daily.time[a.daily.time.length - 1]}`],
    ['Nb jours', String(a.daily.time.length)],
    ['Resolution', '~25 km (interpolee)']
  ]
});
```

## Examples

### Comparer ete 2003 et 1976 a Lyon
Lancer 2x le pipeline en `Promise.all` (start/end differents), superposer 2 series sur un meme chart.

### Hiver le plus froid a Strasbourg
Boucler de 1940 a 2024 sur janv-fev (attention au volume) -- preferer un sample par decennie.

## Common mistakes

- ERA5 commence en 1940 -- avant cette date, retourner une erreur explicite
- Ne pas demander une periode > 5 ans en daily -- volume de reponse explose (preferer un resample mensuel)
- Le format date EST `YYYY-MM-DD` strict -- "2003" ou "01/06/2003" ne marche pas
- ERA5 est une REANALYSE, pas une mesure de station -- attention aux ecarts en relief complexe
- Toujours indiquer la source dans le kv -- l'utilisateur doit savoir que c'est de la reanalyse
- Pour comparer 2 etes : meme periode (1er juin -> 31 aout), sinon biais
