---
id: mountain-summit-conditions
name: Conditions au sommet (alpinisme, ski, rando haute montagne)
description: Stat-cards T sommet, vent, ressenti, chart vent + T par tranches 6h sur 3 jours, kv altitude/visibilite
when: l'utilisateur demande les conditions au sommet d'une montagne, alpinisme, ski hors-piste, refuge d'altitude
servers: [openmeteo]
tools_used: [geocoding, elevation, weather_forecast]
data_type: dashboard
components_used: [stat-card, chart-rich, kv]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards en haut, chart 3j en milieu, kv en bas
---

## When to use

- "Conditions au sommet du Pic du Midi pour samedi"
- "Mont-Blanc demain pour alpinisme"
- "Ski hors-piste a la Grave conditions ?"
- "Refuge des Ecrins meteo des prochains jours"
- "Vent au Aiguille du Midi"

Critique pour montagne / alpinisme. Les valeurs `weather_forecast` standard sont au sol et insuffisantes.

## How to use

1. `geocoding({ name, count: 1 })` -- privilegier l'option de pic la plus precise.
2. `elevation` pour confirmer l'altitude precise du point.
3. `weather_forecast` avec `hourly: [temperature_2m, wind_speed_120m, wind_speed_180m, wind_gusts_10m, freezing_level_height, visibility, snowfall]` sur 3 jours -- les vents 120m/180m approchent ceux du sommet.
4. Calculer ressenti (Wind Chill) au sommet.
5. Rendre stat-cards, chart vent + T 6h-tranches, kv altitude / visibilite / iso 0C.

```js
const geo = await call('geocoding', { name: 'Pic du Midi de Bigorre', count: 1 });
const { latitude, longitude, timezone, name } = geo.results[0];

const elev = await call('elevation', { latitudes: [latitude], longitudes: [longitude] });
const altitude = elev.elevation[0];

const w = await call('weather_forecast', {
  latitude, longitude, timezone,
  hourly: ['temperature_2m', 'wind_speed_120m', 'wind_gusts_10m', 'freezing_level_height', 'visibility', 'snowfall', 'apparent_temperature'],
  forecast_days: 3
});

// Tranches 6h pour eviter 72 points illisibles
function downsample6h(arr, times) {
  const out = [], outT = [];
  for (let i = 0; i < arr.length; i += 6) {
    out.push(arr[i]);
    outT.push(times[i]);
  }
  return { values: out, times: outT };
}

const tDS = downsample6h(w.hourly.temperature_2m, w.hourly.time);
const windDS = downsample6h(w.hourly.wind_speed_120m, w.hourly.time);
const apparentNow = w.hourly.apparent_temperature[0];
const windNow = w.hourly.wind_speed_120m[0];
const isoZero = w.hourly.freezing_level_height[0];
const visKm = (w.hourly.visibility[0] / 1000).toFixed(1);

await widget('stat-card', {
  title: `Conditions ${name} (${altitude}m)`,
  items: [
    { label: 'T sommet', value: `${w.hourly.temperature_2m[0].toFixed(1)}C`, icon: 'thermometer' },
    { label: 'Ressenti', value: `${apparentNow.toFixed(1)}C`, icon: 'wind' },
    { label: 'Vent (120m)', value: `${windNow.toFixed(0)} km/h`, icon: 'wind' },
    { label: 'Iso 0C', value: `${isoZero.toFixed(0)} m`, icon: 'snowflake' }
  ]
});

await widget('chart-rich', {
  title: 'Vent et T (tranches 6h, 3 jours)',
  type: 'line',
  xAxis: { label: 'Heure', data: tDS.times },
  series: [
    { label: 'T (C)', data: tDS.values, color: '#3498db' },
    { label: 'Vent 120m (km/h)', data: windDS.values, color: '#e67e22' }
  ]
});

await widget('kv', {
  title: 'Donnees complementaires',
  pairs: [
    ['Altitude', `${altitude} m`],
    ['Visibilite actuelle', `${visKm} km`],
    ['Iso 0C actuelle', `${isoZero.toFixed(0)} m`],
    ['Rafale max prevue 3j', `${Math.max(...w.hourly.wind_gusts_10m).toFixed(0)} km/h`],
    ['Neige prevue 3j', `${w.hourly.snowfall.reduce((s,v)=>s+v,0).toFixed(1)} cm`]
  ]
});
```

## Examples

### Mont-Blanc
`geocoding({ name: 'Mont-Blanc' })` peut renvoyer plusieurs entites -- verifier le `country` et le `feature_code`.

### La Grave hors-piste
Pipeline standard ; ajouter une stat-card "neige fraiche 24h" critique pour ski.

## Common mistakes

- `weather_forecast` standard donne la T au sol (modele), pas au sommet -- l'API tient compte de l'altitude mais imparfaitement
- Le vent au sol (`wind_speed_10m`) sous-estime largement le vent au sommet -- preferer `wind_speed_120m` ou `_180m`
- Calculer le ressenti soi-meme si `apparent_temperature` n'est pas dispo (formule wind chill)
- Iso 0C important pour les conditions de neige -- toujours l'afficher
- 72 points hourly sur 3j sont illisibles -- tranches 6h ou 12h
- Ne pas omettre la visibilite -- critique pour navigation en relief
