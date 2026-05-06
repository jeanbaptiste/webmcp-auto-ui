---
id: city-weather-dashboard
name: Tableau de bord meteo complet d'une ville
description: KPIs actuels (T, vent, humidite), chart 48h hourly et infos cle (lever/coucher, UV) pour une ville
when: l'utilisateur demande la meteo d'une ville, "quel temps fait-il a X", un tableau de bord meteo immediat ou les conditions actuelles + prochaines heures
servers: [openmeteo]
tools_used: [geocoding, weather_forecast]
data_type: dashboard
components_used: [stat-card, chart-rich, kv]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards en haut, chart 48h plein largeur, kv en bas
---

## When to use

- "Quel temps fait-il a Lille en ce moment ?"
- "Tableau de bord meteo Lyon"
- "Conditions actuelles a Marseille et prochaines heures"
- "Meteo de Bordeaux maintenant"
- "Que va faire le temps cet apres-midi a Nantes ?"

Cette recette remplace 3 onglets d'une app meteo classique : KPI actuels, courbe 48h et infos pratiques.

## How to use

1. Resoudre le nom de ville via `geocoding` pour obtenir `latitude`, `longitude`, `timezone`.
2. Appeler `weather_forecast` avec `current_weather: true`, hourly 48h (`temperature_2m`, `precipitation`, `wind_speed_10m`, `relative_humidity_2m`) et daily (`sunrise`, `sunset`, `uv_index_max`).
3. Decoder le `weathercode` en libelle (0=ciel degage, 1-3=nuageux, 45-48=brouillard, 51-67=pluie, 71-77=neige, 80-82=averses, 95-99=orage).
4. Afficher 4 stat-cards (T, vent, humidite, pluie 24h), un chart-rich 48h avec T + precipitations en bar, et un kv (lever/coucher, UV).

```js
const geo = await call('geocoding', { name: 'Lille', count: 1 });
const place = geo?.results?.[0];
if (!place) {
  await widget('text', { content: 'Ville introuvable.' });
  return;
}
const { latitude, longitude, timezone } = place;

const w = await call('weather_forecast', {
  latitude, longitude, timezone,
  current_weather: true,
  hourly: ['temperature_2m', 'precipitation', 'wind_speed_10m', 'relative_humidity_2m'],
  daily: ['sunrise', 'sunset', 'uv_index_max', 'precipitation_sum'],
  forecast_days: 2
}).catch(() => null);

if (!w) {
  await widget('text', { content: 'Donnees meteo indisponibles.' });
  return;
}

const cur = w.current_weather ?? {};
const hourly = w.hourly ?? {};
const daily = w.daily ?? {};
const hourly48 = (hourly.time ?? []).slice(0, 48);

await widget('stat-card', {
  title: 'Meteo actuelle - Lille',
  items: [
    { label: 'Temperature', value: cur.temperature != null ? `${cur.temperature}C` : '—' },
    { label: 'Vent', value: cur.windspeed != null ? `${cur.windspeed} km/h` : '—' },
    { label: 'Humidite', value: hourly.relative_humidity_2m?.[0] != null ? `${hourly.relative_humidity_2m[0]}%` : '—' },
    { label: 'Pluie 24h', value: daily.precipitation_sum?.[0] != null ? `${daily.precipitation_sum[0]} mm` : '—' }
  ]
});

await widget('chart-rich', {
  title: 'Prochaines 48h',
  type: 'line',
  labels: hourly48,
  datasets: [
    { label: 'Temperature (C)', data: (hourly.temperature_2m ?? []).slice(0, 48), color: '#e74c3c' },
    { label: 'Precipitation (mm)', data: (hourly.precipitation ?? []).slice(0, 48), color: '#3498db' }
  ]
});

await widget('kv', {
  title: 'Infos pratiques',
  pairs: [
    { key: 'Lever du soleil', value: daily.sunrise?.[0]?.slice(11, 16) ?? '—' },
    { key: 'Coucher du soleil', value: daily.sunset?.[0]?.slice(11, 16) ?? '—' },
    { key: 'UV max aujourd\'hui', value: daily.uv_index_max?.[0] != null ? String(daily.uv_index_max[0]) : '—' }
  ]
});
```

## Examples

### Paris maintenant
```js
const geo = await call('geocoding', { name: 'Paris', count: 1 });
const p = geo?.results?.[0];
if (!p) { await widget('text', { content: 'Ville introuvable.' }); return; }
const w = await call('weather_forecast', {
  latitude: p.latitude,
  longitude: p.longitude,
  timezone: p.timezone,
  current_weather: true,
  hourly: ['temperature_2m', 'precipitation'],
  daily: ['sunrise', 'sunset', 'uv_index_max'],
  forecast_days: 2
}).catch(() => null);
const t = w?.current_weather?.temperature;
await widget('stat-card', { title: 'Paris', items: [{ label: 'T', value: t != null ? `${t}C` : '—' }] });
```

### Toulouse cet apres-midi
Meme pipeline avec `hourly: ['temperature_2m', 'precipitation_probability', 'wind_speed_10m']` limite aux 12 prochaines heures.

## Common mistakes

- Ne JAMAIS hardcoder les coordonnees -- toujours passer par `geocoding` d'abord
- Toujours passer le `timezone` du resultat geocoding a `weather_forecast`, sinon les heures seront en UTC
- Ne pas afficher le `weathercode` brut -- decoder en libelle et icone parlants
- Limiter le chart hourly a 48h max pour la lisibilite
- `current_weather: true` est un booleen, pas un tableau de variables comme `hourly`
- Ne pas oublier de slicer `sunrise`/`sunset` (format ISO complet) pour n'afficher que `HH:MM`
