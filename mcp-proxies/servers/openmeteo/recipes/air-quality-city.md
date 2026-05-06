---
id: air-quality-city
name: Qualite de l'air et pollens d'une ville
description: AQI europeen, PM2.5, PM10, ozone, pollens (graminees/bouleau/olivier) sur 5 jours, UV index
when: l'utilisateur demande la qualite de l'air, la pollution, les pollens, le risque allergie, ou un suivi sante environnement
servers: [openmeteo]
tools_used: [geocoding, air_quality]
data_type: dashboard
components_used: [stat-card, chart-rich, kv]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards en haut, chart pollens en milieu, kv UV/details en bas
---

## When to use

- "Pollens et qualite de l'air a Lyon cette semaine"
- "PM2.5 a Paris en ce moment"
- "Pollution Marseille aujourd'hui"
- "Risque allergie graminees a Toulouse"
- "Indice UV Bordeaux demain"

Critique pour asthmatiques, allergiques, parents jeunes enfants, personnes agees.

## How to use

1. `geocoding({ name, count: 1 })`.
2. `air_quality` avec `current: [european_aqi, pm2_5, pm10, ozone]` et `hourly: [alder_pollen, birch_pollen, grass_pollen, olive_pollen, ragweed_pollen, uv_index]`, 5 jours.
3. Decoder AQI europeen : 0-20 = bon, 20-40 = correct, 40-60 = moyen, 60-80 = mauvais, 80-100 = tres mauvais, >100 = extremement mauvais.
4. Rendre stat-cards (AQI + 3 polluants), chart pollens 5j, kv UV.

```js
const geo = await call('geocoding', { name: 'Lyon', count: 1 });
const place = geo?.results?.[0];
if (!place) {
  await widget('text', { content: 'Ville introuvable.' });
  return;
}
const { latitude, longitude, timezone } = place;

const a = await call('air_quality', {
  latitude, longitude, timezone,
  current: ['european_aqi', 'pm2_5', 'pm10', 'ozone'],
  hourly: ['grass_pollen', 'birch_pollen', 'olive_pollen', 'ragweed_pollen', 'uv_index'],
  forecast_days: 5
}).catch(() => null);

if (!a) {
  await widget('text', { content: 'Donnees qualite de l\'air indisponibles.' });
  return;
}

const aqi = a.current?.european_aqi ?? null;
const aqiLabel = aqi == null ? '—' : aqi < 20 ? 'Bon' : aqi < 40 ? 'Correct' : aqi < 60 ? 'Moyen' : aqi < 80 ? 'Mauvais' : 'Tres mauvais';

await widget('stat-card', {
  title: `Qualite de l'air - ${place.name}`,
  items: [
    { label: 'AQI europeen', value: aqi == null ? '—' : `${aqi} (${aqiLabel})`, icon: 'wind' },
    { label: 'PM2.5', value: Number.isFinite(a.current?.pm2_5) ? `${a.current.pm2_5.toFixed(1)} ug/m3` : '—', icon: 'circle' },
    { label: 'PM10', value: Number.isFinite(a.current?.pm10) ? `${a.current.pm10.toFixed(1)} ug/m3` : '—', icon: 'circle' },
    { label: 'Ozone', value: Number.isFinite(a.current?.ozone) ? `${a.current.ozone.toFixed(0)} ug/m3` : '—', icon: 'sun' }
  ]
});

const hourly = a.hourly ?? {};
const times = hourly.time ?? [];
const timesEvery6h = times.filter((_, i) => i % 6 === 0);
const sliceEvery6h = (arr) => (arr ?? []).filter((_, i) => i % 6 === 0);
await widget('chart-rich', {
  title: 'Pollens sur 5 jours (grains/m3)',
  type: 'line',
  xAxis: { label: 'Heure', data: timesEvery6h.map(t => t.slice(5, 16).replace('T', ' ')) },
  series: [
    { label: 'Graminees', data: sliceEvery6h(hourly.grass_pollen), color: '#27ae60' },
    { label: 'Bouleau', data: sliceEvery6h(hourly.birch_pollen), color: '#8e44ad' },
    { label: 'Olivier', data: sliceEvery6h(hourly.olive_pollen), color: '#f39c12' },
    { label: 'Ambroisie', data: sliceEvery6h(hourly.ragweed_pollen), color: '#c0392b' }
  ]
});

const uvSeries = hourly.uv_index ?? [];
let noonIdx = times.map((t, i) => t.endsWith('T12:00') ? i : -1).filter(i => i >= 0).slice(0, 5);
if (noonIdx.length === 0) {
  // Fallback : une valeur UV max par jour calendaire
  const byDay = {};
  times.forEach((t, i) => {
    const day = t.slice(0, 10);
    const v = uvSeries[i];
    if (Number.isFinite(v) && (byDay[day] == null || v > uvSeries[byDay[day]])) byDay[day] = i;
  });
  noonIdx = Object.values(byDay).slice(0, 5);
}
await widget('kv', {
  title: 'UV index midi (5j)',
  pairs: noonIdx.map(i => {
    const v = uvSeries[i];
    const label = !Number.isFinite(v) ? '—' : `${v} (${v < 3 ? 'faible' : v < 6 ? 'modere' : v < 8 ? 'fort' : 'tres fort'})`;
    return [times[i].slice(0, 10), label];
  })
});
```

## Examples

### Pollens graminees a Toulouse
Cibler une seule serie `grass_pollen` ; ajouter une stat-card "pic prevu" avec timestamp.

### Episode pollution Paris
Si AQI > 80, ajouter un text d'alerte avec recommandation OMS (limiter sport en exterieur).

## Common mistakes

- L'AQI "european" et "us" ont des echelles differentes -- ne pas melanger
- Les pollens ne sont dispo qu'en Europe -- hors UE, les series seront null
- PM2.5 et PM10 sont en ug/m3, pas en ppm -- ne pas confondre les unites
- L'UV index varie au cours de la journee -- prendre la valeur midi (pic), pas la moyenne
- Les seuils OMS PM2.5 sont 5 ug/m3 (annuel) et 15 ug/m3 (24h) -- bien plus stricts que l'AQI europeen
- Ne pas afficher le pollen "Aulne" hors saison hivernale -- la serie sera quasi nulle (et illisible)
