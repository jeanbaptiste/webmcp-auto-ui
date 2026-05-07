---
id: route-elevation-weather
name: Profil elevation + meteo aux waypoints d'un itineraire
description: Chart altitude vs distance, table meteo (T + vent) par waypoint, carte avec trace et marqueurs
when: l'utilisateur planifie une randonnee, un itineraire velo, ski de rando, alpinisme avec dimension altitude + meteo
servers: [openmeteo]
tools_used: [geocoding, elevation, weather_forecast]
data_type: geo
components_used: [map, chart-rich, kv, table]
layout:
  type: grid
  columns: 1
  arrangement: carte avec trace en haut, chart elevation au milieu, table meteo dessous
---

## When to use

- "Meteo et profil pour la randonnee GR20 etape 4"
- "Itineraire Chamonix -> Aoste, T et vent"
- "Profil velo de Briancon a Galibier"
- "Meteo en montagne sur ce parcours"
- "Conditions de ski de rando Vanoise"

Combine deux dimensions souvent ignorees separement.

## How to use

1. Resoudre les waypoints (noms ou tableaux de coordonnees) via `geocoding` si necessaire.
2. `elevation({ latitudes: [...], longitudes: [...] })` pour obtenir l'altitude de chaque point.
3. Pour chaque waypoint en parallele : `weather_forecast` avec `current` (T, vent).
4. Calculer distances cumulees (Haversine) et profil.
5. Rendre carte (markers + trace), chart elevation, table meteo waypoints.

```js
const waypoints = [
  { name: 'Chamonix', lat: 45.9237, lon: 6.8694 },
  { name: 'Col du Geant', lat: 45.8636, lon: 6.9528 },
  { name: 'Aoste', lat: 45.7372, lon: 7.3206 }
];

const [elev, meteos] = await Promise.all([
  call('elevation', {
    latitudes: waypoints.map(w => w.lat),
    longitudes: waypoints.map(w => w.lon)
  }).catch(() => null),
  Promise.all(waypoints.map(w =>
    call('weather_forecast', {
      latitude: w.lat, longitude: w.lon,
      current: ['temperature_2m', 'wind_speed_10m', 'wind_direction_10m'],
      timezone: 'auto'
    }).catch(() => null)
  ))
]);
const elevations = elev?.elevation ?? waypoints.map(() => null);

function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

let cum = 0;
const distances = waypoints.map((w, i) => {
  if (i === 0) return 0;
  cum += haversine(waypoints[i-1], w);
  return cum;
});

const centerWp = waypoints[Math.floor(waypoints.length / 2)] ?? waypoints[0];
await widget('map', {
  title: 'Itineraire',
  center: { lat: centerWp.lat, lng: centerWp.lon },
  zoom: 10,
  markers: waypoints.map((w, i) => {
    const t = meteos[i]?.current?.temperature_2m;
    return {
      lat: w.lat, lon: w.lon, label: w.name,
      popup: `${w.name} - alt ${elevations[i] ?? '—'}m, T ${Number.isFinite(t) ? t : '—'}C`
    };
  }),
  geojson: {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: waypoints.map(w => [w.lon, w.lat])
    },
    properties: { color: '#e74c3c' }
  }
});

await widget('chart-rich', {
  title: 'Profil d\'altitude',
  type: 'line',
  labels: distances.map(d => d.toFixed(1) + ' km'),
  data: [{ label: 'Altitude (m)', values: elevations.map(e => e ?? 0), color: '#27ae60' }]
});

await widget('data-table', {
  title: 'Meteo aux waypoints',
  columns: ['Point', 'Altitude (m)', 'T (C)', 'Vent (km/h)', 'Direction'],
  rows: waypoints.map((w, i) => {
    const cur = meteos[i]?.current ?? {};
    return [
      w.name,
      elevations[i] ?? '—',
      Number.isFinite(cur.temperature_2m) ? cur.temperature_2m.toFixed(1) : '—',
      Number.isFinite(cur.wind_speed_10m) ? cur.wind_speed_10m.toFixed(0) : '—',
      cur.wind_direction_10m != null ? `${cur.wind_direction_10m}°` : '—'
    ];
  })
});
```

## Examples

### GR20 etape 4 (Corse)
Decomposer l'etape en 5-7 waypoints (refuges, cols), meme pipeline.

### Velo Briancon-Galibier
Densifier les waypoints (un point tous les 2-3 km) pour un profil propre.

## Common mistakes

- `elevation` accepte des arrays de lat/lon -- ne pas faire un appel par point (10x plus lent)
- Plus de 100 waypoints peut faire timeout -- echantillonner sur les pas de 100m de denivele
- La meteo "T au sol" donnee par `weather_forecast` est corrigee de l'altitude par le modele, mais imparfaite -- pour un sommet, croiser avec recette `mountain-summit-conditions`
- Toujours afficher la trace sur la carte (`paths`), pas seulement les marqueurs -- l'utilisateur doit voir l'itineraire
- Calculer la distance via Haversine, pas L1/L2 sur lat-lon (faux a l'echelle km)
- Eviter d'afficher altitude en pieds par defaut -- metres sauf demande explicite (impose en montagne francaise)
