---
id: flood-river-risk
name: Risque de crue fluviale (GloFAS) sur 30 jours
description: Chart debit fluvial 30j, stat-cards "debit max attendu" et "ecart vs normale", carte du point hydro
when: l'utilisateur demande le risque d'inondation, "crue de la Seine", "le Rhone va-t-il deborder", debit d'une riviere, alerte hydrologique
servers: [openmeteo]
tools_used: [geocoding, flood_forecast]
data_type: timeseries
components_used: [chart-rich, map, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: chart 30j pleine largeur, stat-cards + carte dessous
---

## When to use

- "Risque de crue de la Loire a Tours dans les 2 prochaines semaines ?"
- "La Seine va-t-elle deborder a Paris ?"
- "Debit du Rhone a Lyon ce mois-ci"
- "Alerte inondation a Bordeaux ?"
- "Niveau de la Garonne attendu apres les pluies"

Outil rare en grand public ; alerte preventive utile en zone inondable.

## How to use

1. `geocoding({ name: "Tours", count: 1 })` -- la coordonnee doit etre proche d'un fleuve majeur (GloFAS = grands cours d'eau).
2. `flood_forecast` avec `daily: [river_discharge, river_discharge_mean, river_discharge_max, river_discharge_min, river_discharge_p50]` sur 30 jours.
3. Comparer la prevision a la moyenne climatologique (`river_discharge_mean`).
4. Rendre chart, stat-cards (max attendu, ecart vs normale, jour critique), carte du point.

```js
const geo = await call('geocoding', { name: 'Tours', count: 1 });
const { latitude, longitude, timezone, name } = geo.results[0];

const f = await call('flood_forecast', {
  latitude, longitude,
  daily: ['river_discharge', 'river_discharge_mean', 'river_discharge_max', 'river_discharge_p50'],
  forecast_days: 30
});

const peak = Math.max(...f.daily.river_discharge);
const peakIdx = f.daily.river_discharge.indexOf(peak);
const meanClimato = f.daily.river_discharge_mean.reduce((a, b) => a + b, 0) / f.daily.river_discharge_mean.length;
const ratio = peak / meanClimato;
const status = ratio > 3 ? 'Crue probable' : ratio > 2 ? 'Vigilance' : ratio > 1.3 ? 'Au-dessus normale' : 'Normal';

await widget('chart-rich', {
  title: `Debit ${name} - prevision 30 jours (m3/s)`,
  type: 'line',
  xAxis: { label: 'Date', data: f.daily.time },
  series: [
    { label: 'Prevision', data: f.daily.river_discharge, color: '#2980b9' },
    { label: 'Mediane (p50)', data: f.daily.river_discharge_p50, color: '#7f8c8d' },
    { label: 'Climatologie', data: f.daily.river_discharge_mean, color: '#bdc3c7', dashed: true }
  ]
});

await widget('stat-card', {
  items: [
    { label: 'Debit max prevu', value: `${peak.toFixed(0)} m3/s`, icon: 'trending-up' },
    { label: 'Date du pic', value: f.daily.time[peakIdx], icon: 'calendar' },
    { label: 'Ratio vs normale', value: `x${ratio.toFixed(2)} (${status})`, icon: 'alert-triangle' }
  ]
});

await widget('map', {
  title: `Point hydro - ${name}`,
  center: { lat: latitude, lng: longitude }, zoom: 11,
  markers: [{ lat: latitude, lng: longitude, label: name, popup: `Pic ${peak.toFixed(0)} m3/s le ${f.daily.time[peakIdx]}` }]
});
```

## Examples

### Loire a Tours apres episode pluvieux
Pipeline ci-dessus. Si `ratio > 3`, ajouter un text d'alerte rouge.

### Garonne a Bordeaux
Meme pipeline ; les marees Atlantique modulent le debit aval -- mentionner la limitation.

## Common mistakes

- GloFAS couvre les GRANDS cours d'eau (largeur > ~1 km de bassin versant) -- un ru local renverra null
- Ne pas comparer le debit a un seuil absolu sans contexte -- toujours rapporter au climatologique (`river_discharge_mean`)
- L'horizon utile est ~30 jours ; au-dela, l'incertitude domine
- `flood_forecast` ne fournit PAS de hauteur d'eau locale (la conversion debit -> hauteur depend de la station)
- Ne pas confondre `river_discharge` (deterministe) et `_mean`/`_p50`/`_max`/`_min` (statistiques d'ensemble GloFAS)
- Pour de l'alerte critique : croiser avec Vigicrues (autorite officielle), GloFAS = signal precoce mais pas legal
