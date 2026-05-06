---
id: multi-city-map-compare
name: Carte comparative meteo de plusieurs villes
description: Carte avec marqueurs colores par temperature, table recap et stat-cards "ville la plus chaude/froide/pluvieuse"
when: l'utilisateur veut comparer la meteo de plusieurs villes, une carte regionale ou nationale, ou un panorama meteo France/Europe
servers: [openmeteo]
tools_used: [geocoding, weather_forecast]
data_type: geo
components_used: [map, table, stat-card]
layout:
  type: grid
  columns: 1
  arrangement: carte plein ecran en haut, stat-cards puis table dessous
---

## When to use

- "Compare la meteo de Paris, Bordeaux, Strasbourg et Marseille"
- "Carte meteo France"
- "Ou fait-il le plus chaud aujourd'hui en Europe ?"
- "Meteo des grandes villes francaises maintenant"
- "Quelle ville est la plus pluvieuse ce week-end ?"

## How to use

1. Pour chaque ville, `geocoding({ name, count: 1 })` -> coordonnees + timezone.
2. Pour chaque ville, `weather_forecast` avec `current_weather: true` et `daily: [precipitation_sum]` pour 1 jour.
3. Centrer la carte sur le barycentre des villes ; calculer le zoom selon la dispersion.
4. Construire les marqueurs colores selon la T (echelle bleu froid -> rouge chaud).
5. Ajouter table recap et 3 stat-cards (chaud/froid/pluvieux).

```js
const cities = ['Paris', 'Bordeaux', 'Strasbourg', 'Marseille'];

// Helper : temperature -> couleur (bleu #3b82f6 a froid, rouge #ef4444 a chaud, intervalle [0, 35])
function tempToColor(t) {
  const ratio = Math.min(1, Math.max(0, t / 35));
  const r = Math.round(0x3b + ratio * (0xef - 0x3b));
  const g = Math.round(0x82 + ratio * (0x44 - 0x82));
  const b = Math.round(0xf6 + ratio * (0x44 - 0xf6));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

const geos = await Promise.all(cities.map(c => call('geocoding', { name: c, count: 1 }).catch(() => null)));
const points = geos.map(g => g?.results?.[0]).filter(Boolean);

if (points.length === 0) {
  await widget('text', { content: 'Aucune ville trouvee.' });
  return;
}

const meteos = await Promise.all(points.map(p => call('weather_forecast', {
  latitude: p.latitude, longitude: p.longitude, timezone: p.timezone,
  current_weather: true,
  daily: ['precipitation_sum'],
  forecast_days: 1
}).catch(() => null)));

const data = points.map((p, i) => {
  const m = meteos[i];
  return {
    name: p.name ?? '—',
    lat: p.latitude,
    lng: p.longitude,
    temp: m?.current_weather?.temperature,
    wind: m?.current_weather?.windspeed,
    rain: m?.daily?.precipitation_sum?.[0]
  };
}).filter(d => Number.isFinite(d.temp));

if (data.length === 0) {
  await widget('text', { content: 'Donnees meteo indisponibles pour les villes demandees.' });
  return;
}

const center = {
  lat: data.reduce((s, d) => s + d.lat, 0) / data.length,
  lng: data.reduce((s, d) => s + d.lng, 0) / data.length
};

// Zoom dynamique selon la dispersion lat/lng des villes
const latSpan = Math.max(...data.map(d => d.lat)) - Math.min(...data.map(d => d.lat));
const lngSpan = Math.max(...data.map(d => d.lng)) - Math.min(...data.map(d => d.lng));
const span = Math.max(latSpan, lngSpan);
const zoom = span < 3 ? 8 : span < 8 ? 6 : span < 20 ? 5 : 4;

await widget('map', {
  title: 'Meteo actuelle - comparaison villes',
  center, zoom,
  markers: data.map(d => ({
    lat: d.lat, lng: d.lng, label: d.name,
    color: tempToColor(d.temp),
    popup: `${d.name} : ${d.temp}C, vent ${d.wind ?? '—'} km/h, pluie 24h ${d.rain ?? '—'} mm`
  }))
});

const hottest = data.reduce((a, b) => a.temp > b.temp ? a : b);
const coldest = data.reduce((a, b) => a.temp < b.temp ? a : b);
const withRain = data.filter(d => Number.isFinite(d.rain));
const wettest = withRain.length > 0 ? withRain.reduce((a, b) => a.rain > b.rain ? a : b) : null;

await widget('stat-card', { label: 'Plus chaude', value: `${hottest.name} (${hottest.temp}C)`, icon: 'sun' });
await widget('stat-card', { label: 'Plus froide', value: `${coldest.name} (${coldest.temp}C)`, icon: 'snowflake' });
await widget('stat-card', { label: 'Plus pluvieuse', value: wettest ? `${wettest.name} (${wettest.rain}mm)` : '—', icon: 'cloud-rain' });

await widget('data-table', {
  headers: ['Ville', 'T (C)', 'Vent (km/h)', 'Pluie 24h (mm)'],
  rows: data.map(d => [d.name, d.temp, d.wind ?? '—', Number.isFinite(d.rain) ? d.rain.toFixed(1) : '—'])
});
```

## Examples

### Comparer 6 villes europeennes
`['Paris', 'Madrid', 'Rome', 'Berlin', 'Londres', 'Stockholm']` -- adapter `zoom: 4` et le centre.

### Tour de France des regions
8 villes francaises ; couleur du marqueur en fonction de la T (palette).

## Common mistakes

- Ne pas oublier d'utiliser `Promise.all` pour les appels paralleles -- en sequentiel, 8 villes = 8x temps
- Centrer la carte sur le barycentre, pas sur la 1re ville
- Adapter le `zoom` au nombre de villes : 4 villes France -> zoom 6, Europe -> zoom 4
- Ne pas mettre `current_weather: true` ET `current: [...]` ensemble -- choisir un seul mode
- Toujours decoder le `weathercode` dans les popups (un nombre brut n'est pas parlant)
- Si une ville renvoie 0 resultat geocoding, filtrer avant de continuer (sinon `undefined.latitude`)
