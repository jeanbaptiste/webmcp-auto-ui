---
id: weekly-forecast-rich
name: Previsions meteo enrichies sur 7 a 14 jours
description: Chart Tmin/Tmax + precipitations daily, table jour par jour, stat-cards "jour le plus chaud" et "total pluie" pour une ville
when: l'utilisateur demande les previsions de la semaine, "meteo des 7 prochains jours", planning hebdomadaire ou previsions long terme grand public
servers: [openmeteo]
tools_used: [geocoding, weather_forecast]
data_type: timeseries
components_used: [chart-rich, table, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: chart pleine largeur, table + stat-cards dessous
---

## When to use

- "Donne-moi la meteo pour Toulouse cette semaine"
- "Previsions 7 jours a Strasbourg"
- "Meteo de la semaine prochaine a Brest"
- "A quoi va ressembler la semaine cote temperatures a Lyon ?"
- "Planning meteo Bordeaux pour le week-end et la semaine"

Aide a planifier sortie, jardinage, lessive, voyage court.

## How to use

1. `geocoding({ name, count: 1 })` -> `latitude, longitude, timezone`.
2. `weather_forecast` avec `daily: [temperature_2m_max, temperature_2m_min, precipitation_sum, precipitation_probability_max, weather_code, wind_speed_10m_max]` et `forecast_days: 7` (ou 14, max 16).
3. Calculer agregats : indice du jour le plus chaud (`Math.max(...tmax)`), somme des precipitations.
4. Rendre chart-rich (lignes Tmax/Tmin + barres pluie), table jour par jour et 2 stat-cards.

```js
const geo = await call('geocoding', { name: 'Toulouse', count: 1 });
const place = geo?.results?.[0];
if (!place) {
  await widget('text', { content: 'Ville introuvable.' });
  return;
}
const { latitude, longitude, timezone } = place;

const w = await call('weather_forecast', {
  latitude, longitude, timezone,
  daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum',
          'precipitation_probability_max', 'wind_speed_10m_max'],
  forecast_days: 7
}).catch(() => null);

if (!w?.daily?.time?.length) {
  await widget('text', { content: 'Donnees meteo indisponibles.' });
  return;
}

const d = w.daily;
const tmaxArr = (d.temperature_2m_max ?? []).map(v => Number.isFinite(v) ? v : null);
const tmaxFinite = tmaxArr.filter(v => v != null);
const hottestVal = tmaxFinite.length > 0 ? Math.max(...tmaxFinite) : null;
const hottestIdx = hottestVal != null ? tmaxArr.indexOf(hottestVal) : -1;
const totalRain = (d.precipitation_sum ?? []).filter(v => Number.isFinite(v)).reduce((a, b) => a + b, 0);

await widget('chart-rich', {
  title: 'Temperatures 7 jours - Toulouse',
  type: 'line',
  labels: (d.time ?? []).map(String),
  data: [
    { label: 'Tmax (C)', values: (d.temperature_2m_max ?? []).map(Number), color: '#e74c3c' },
    { label: 'Tmin (C)', values: (d.temperature_2m_min ?? []).map(Number), color: '#3498db' }
  ]
});

await widget('chart-rich', {
  title: 'Precipitations 7 jours - Toulouse',
  type: 'bar',
  labels: (d.time ?? []).map(String),
  data: [
    { label: 'Pluie (mm)', values: (d.precipitation_sum ?? []).map(Number), color: '#95a5a6' }
  ]
});

await widget('data-table', {
  title: 'Detail jour par jour',
  columns: ['Jour', 'Tmax', 'Tmin', 'Pluie (mm)', 'Prob. pluie', 'Vent max'],
  rows: (d.time ?? []).map((t, i) => ({
    'Jour': t,
    'Tmax': d.temperature_2m_max?.[i] != null ? `${d.temperature_2m_max[i]}C` : '—',
    'Tmin': d.temperature_2m_min?.[i] != null ? `${d.temperature_2m_min[i]}C` : '—',
    'Pluie (mm)': Number.isFinite(d.precipitation_sum?.[i]) ? d.precipitation_sum[i].toFixed(1) : '—',
    'Prob. pluie': d.precipitation_probability_max?.[i] != null ? `${d.precipitation_probability_max[i]}%` : '—',
    'Vent max': d.wind_speed_10m_max?.[i] != null ? `${d.wind_speed_10m_max[i]} km/h` : '—'
  }))
});

await widget('stat-card', {
  items: [
    { label: 'Jour le plus chaud', value: hottestIdx >= 0 ? `${d.time?.[hottestIdx] ?? '—'} (${hottestVal}C)` : '—', icon: 'sun' },
    { label: 'Total pluie 7j', value: `${totalRain.toFixed(1)} mm`, icon: 'cloud-rain' }
  ]
});
```

## Examples

### Strasbourg sur 14 jours
Meme pipeline avec `forecast_days: 14`. Au-dela de 7 jours, indiquer dans le titre que la fiabilite decroit ; preferer la recette `ensemble-uncertainty-band` au-dela de J+5.

### Brest week-end + semaine
Pipeline identique. Le table met en evidence visuellement les 2 jours du week-end via une colonne "type" (Sam/Dim).

## Common mistakes

- Ne pas depasser `forecast_days: 16` (limite API) ; au-dela utiliser `seasonal_forecast`
- Toujours inclure `precipitation_probability_max` -- sans probabilite, "0 mm" est trompeur (pluie possible mais < 0.1mm)
- Limiter le chart a 7-10 points pour la lisibilite ; pour 14j, alterner avec un table plus dense
- Ne pas confondre `precipitation_sum` (mm cumules sur 24h) et `precipitation_probability_max` (%)
- Toujours passer le `timezone` -- sinon `time` est en UTC et decale les jours
- Ne pas oublier le `weather_code` daily si on veut afficher des icones meteo dans le table
