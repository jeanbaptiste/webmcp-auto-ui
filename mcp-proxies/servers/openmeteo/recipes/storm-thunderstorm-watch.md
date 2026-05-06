---
id: storm-thunderstorm-watch
name: Veille orages / fenetre sans pluie 48h
description: Chart probabilite orages (CAPE, precipitations convectives), timeline creneaux a risque, carte zones, stat-card fenetre stable
when: l'utilisateur planifie une activite plein-air, "orages prevus", "creneau sec ce soir", securite evenement
servers: [openmeteo]
tools_used: [geocoding, weather_forecast, ensemble_forecast]
data_type: timeseries
components_used: [map, chart-rich, stat-card, timeline]
layout:
  type: grid
  columns: 2
  arrangement: chart 48h en haut, timeline + stat-card en milieu, carte en bas
---

## When to use

- "Aurai-je un creneau sec pour mon barbecue samedi a Bordeaux ?"
- "Orages prevus ce soir sur Toulouse ?"
- "Mariage en exterieur dimanche, risque pluie ?"
- "Festival samedi, orages a craindre ?"
- "Sortie velo cet apres-midi sans pluie ?"

Decision en temps quasi-reel pour activites plein-air.

## How to use

1. `geocoding({ name, count: 1 })`.
2. `weather_forecast` hourly 48h : `precipitation`, `precipitation_probability`, `cape`, `lifted_index`, `weather_code`.
3. `ensemble_forecast` (optionnel) pour confirmer la probabilite.
4. Detecter creneaux a risque (CAPE > 1000 ET lifted_index < -3, ou weather_code in 95..99) et creneaux stables (precip = 0 sur >= 3h consecutifs).
5. Rendre chart, timeline episodes, stat-card fenetre stable la plus large, carte.

```js
const geo = await call('geocoding', { name: 'Bordeaux', count: 1 });
const place = geo?.results?.[0];
if (!place) {
  await widget('text', { content: 'Ville introuvable.' });
  return;
}
const { latitude, longitude, timezone, name } = place;

const w = await call('weather_forecast', {
  latitude, longitude, timezone,
  hourly: ['precipitation', 'precipitation_probability', 'cape', 'lifted_index', 'weather_code'],
  forecast_days: 2
}).catch(() => null);

if (!w?.hourly?.time?.length) {
  await widget('text', { content: 'Donnees orages indisponibles.' });
  return;
}

const h = w.hourly;
const cape = h.cape ?? [];
const lifted = h.lifted_index ?? [];
const wcode = h.weather_code ?? [];
const precip = h.precipitation ?? [];
const stormHours = h.time.map((t, i) => ({
  time: t,
  storm: (Number.isFinite(cape[i]) && cape[i] > 1000 && Number.isFinite(lifted[i]) && lifted[i] < -3) || (wcode[i] >= 95 && wcode[i] <= 99)
}));

// Detecter creneau sec consecutif le plus long
let dryStart = -1, bestStart = 0, bestLen = 0, curLen = 0;
precip.forEach((p, i) => {
  if (Number.isFinite(p) && p < 0.1) { if (dryStart < 0) dryStart = i; curLen++; if (curLen > bestLen) { bestLen = curLen; bestStart = dryStart; } }
  else { dryStart = -1; curLen = 0; }
});

const stormEpisodes = [];
let epStart = -1;
stormHours.forEach((s, i) => {
  if (s.storm && epStart < 0) epStart = i;
  else if (!s.storm && epStart >= 0) { stormEpisodes.push({ start: epStart, end: i - 1 }); epStart = -1; }
});

await widget('chart-rich', {
  title: `Probabilite orages 48h - ${name ?? ''} — probabilite`,
  type: 'line',
  xAxis: { label: 'Heure', data: h.time ?? [] },
  series: [
    { label: 'Prob. precip (%)', data: h.precipitation_probability ?? [], color: '#3498db' }
  ]
});

await widget('chart-rich', {
  title: `Probabilite orages 48h - ${name ?? ''} — CAPE / precip`,
  type: 'line',
  xAxis: { label: 'Heure', data: h.time ?? [] },
  series: [
    { label: 'CAPE norm (0-100)', data: (h.cape ?? []).map(v => Number.isFinite(v) ? Math.min(100, v / 50) : 0), color: '#e74c3c' },
    { label: 'Precip (mm)', data: h.precipitation ?? [], color: '#7f8c8d' }
  ]
});

await widget('timeline', {
  title: 'Creneaux a risque',
  events: stormEpisodes.map(e => ({
    date: h.time[e.start] ?? '—',
    label: 'Risque orage',
    detail: `${h.time[e.start]?.slice(11, 16) ?? '—'} -> ${h.time[e.end]?.slice(11, 16) ?? '—'}`,
    color: '#e74c3c'
  }))
});

await widget('stat-card', {
  items: [
    { label: 'Fenetre sans pluie max', value: `${bestLen}h`, icon: 'sun' },
    { label: 'Demarre le', value: bestLen > 0 ? (h.time[bestStart] ?? '—') : '-', icon: 'clock' },
    { label: 'Episodes orageux 48h', value: String(stormEpisodes.length), icon: 'zap' }
  ]
});

await widget('map', {
  title: name ?? '',
  center: { lat: latitude, lng: longitude }, zoom: 9,
  markers: [{ lat: latitude, lng: longitude, label: name ?? '' }]
});
```

## Examples

### Barbecue samedi soir Bordeaux
Filtrer le chart sur 16h-23h ; afficher uniquement la fenetre cible.

### Festival 3 jours
Etendre `forecast_days: 3` ; multiplier les fenetres detectees.

## Common mistakes

- CAPE > 1000 J/kg + lifted_index < -3 = condition orageuse classique, mais pas absolue
- `weather_code` 95-99 = orage, 80-82 = averses (different)
- Ne pas confondre `precipitation_probability` (% chance de pluie) et `precipitation` (mm reels)
- Une fenetre stable de 1h n'est pas un "creneau" -- preferer >= 3h consecutives
- Toujours indiquer le timezone dans le titre / x-axis -- "samedi 21h" change selon TZ
- Pour evenements critiques, croiser avec `ensemble_forecast` pour la fiabilite
