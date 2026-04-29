---
id: marine-sailing-forecast
name: Meteo marine pour navigation cotiere et nautisme
description: Hauteur de vagues, periode, direction, T eau, vent ; chart 72h, stat-cards et carte du point cotier
when: l'utilisateur prepare une sortie en mer, navigation, voile, surf, kitesurf, "houle ce week-end", "meteo marine X"
servers: [openmeteo]
tools_used: [geocoding, marine_weather, weather_forecast]
data_type: marine
components_used: [chart-rich, stat-card, map]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards en haut, chart 72h en milieu, carte en bas
---

## When to use

- "Houle et vent a La Rochelle pour samedi ?"
- "Meteo marine Brest ce week-end"
- "Conditions de surf a Biarritz demain"
- "Puis-je sortir en voilier a Hyeres jeudi ?"
- "Kitesurf possible a La Tranche cette semaine ?"

## How to use

1. `geocoding({ name, count: 1 })` -- la ville doit etre cotiere.
2. En parallele : `marine_weather` (vagues, periode, direction de houle, T eau) et `weather_forecast` (vent 10m). Le tool `marine_weather` ne fournit PAS le vent atmospherique.
3. Decoder la direction de houle en cardinal.
4. Rendre stat-cards (vagues max 72h, periode, T eau, vent max), chart hauteur vagues + vent, carte.

```js
const geo = await call('geocoding', { name: 'La Rochelle', count: 1 });
const { latitude, longitude, timezone, name } = geo.results[0];

const [marine, atmo] = await Promise.all([
  call('marine_weather', {
    latitude, longitude, timezone,
    hourly: ['wave_height', 'wave_period', 'wave_direction', 'sea_surface_temperature'],
    forecast_days: 3
  }),
  call('weather_forecast', {
    latitude, longitude, timezone,
    hourly: ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'],
    forecast_days: 3
  })
]);

const waves = marine.hourly.wave_height;
const maxWave = Math.max(...waves);
const idxMax = waves.indexOf(maxWave);
const seaT = marine.hourly.sea_surface_temperature[0];
const period = marine.hourly.wave_period[idxMax];
const maxWind = Math.max(...atmo.hourly.wind_speed_10m);

await widget('stat-card', {
  title: `Meteo marine - ${name}`,
  items: [
    { label: 'Vagues max 72h', value: `${maxWave.toFixed(1)} m`, icon: 'waves' },
    { label: 'Periode', value: `${period.toFixed(0)} s`, icon: 'clock' },
    { label: 'Temperature eau', value: `${seaT.toFixed(1)} C`, icon: 'thermometer' },
    { label: 'Vent max', value: `${maxWind.toFixed(0)} km/h`, icon: 'wind' }
  ]
});

await widget('chart-rich', {
  title: 'Vagues et vent sur 72h',
  type: 'line',
  xAxis: { label: 'Heure', data: marine.hourly.time },
  series: [
    { label: 'Hauteur vagues (m)', data: waves, color: '#3498db' },
    { label: 'Vent (km/h)', data: atmo.hourly.wind_speed_10m, color: '#e67e22' },
    { label: 'Rafales (km/h)', data: atmo.hourly.wind_gusts_10m, color: '#c0392b' }
  ]
});

await widget('map', {
  title: name,
  center: { lat: latitude, lng: longitude }, zoom: 10,
  markers: [{ lat: latitude, lng: longitude, label: name, popup: `Vagues max ${maxWave.toFixed(1)}m, eau ${seaT.toFixed(1)}C` }]
});
```

## Examples

### Surf a Biarritz
Privilegier `wave_period` (periode > 10s = houle propre) et `wave_direction`.

### Voile cotiere a Brest
Le vent et les rafales sont aussi critiques que la houle ; afficher les 2 series sur le meme chart.

## Common mistakes

- `marine_weather` n'est dispo QUE sur points cotiers/oceaniques -- une ville interieure renverra null
- Ne pas oublier d'appeler aussi `weather_forecast` pour le vent : `marine_weather` ne donne PAS le vent atmospherique
- Toujours convertir la direction de houle en cardinal (degres seuls = peu lisibles)
- Une houle de 1m periode 6s (mer du vent) est moins surfable qu'une houle de 1m periode 12s (houle longue)
- Pour navigation : afficher rafales (`wind_gusts_10m`) en plus de la moyenne -- les rafales font la difference
- T eau (`sea_surface_temperature`) : utile pour combinaison neoprene (combi 4/3 < 18C, shorty > 22C)
