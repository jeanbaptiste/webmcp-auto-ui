---
id: garden-agriculture-week
name: Aide jardinage / agriculture hebdomadaire
description: Stat-cards (gel oui/non, ETP, pluie cumulee 7j), chart Tmin nocturne + precipitations, kv UV pour traitements
when: l'utilisateur jardine ou cultive, "faut-il arroser", "risque de gel cette nuit", besoin agricole concret
servers: [openmeteo]
tools_used: [geocoding, weather_forecast, air_quality]
data_type: dashboard
components_used: [stat-card, chart-rich, kv]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards en haut, chart 7j en milieu, kv en bas
---

## When to use

- "Est-ce que je dois proteger mes tomates cette nuit a Toulouse ?"
- "Faut-il arroser le potager cette semaine a Lyon ?"
- "Risque de gel sur la vigne en Bourgogne ?"
- "Quand traiter les rosiers a Bordeaux (jours sans pluie + sans UV intense) ?"
- "Pluie attendue dans les 7 jours a Limoges ?"

Aide a la decision concrete pour jardiniers, marachers, viticulteurs.

## How to use

1. `geocoding({ name, count: 1 })`.
2. `weather_forecast` daily 7 jours : `temperature_2m_min`, `precipitation_sum`, `et0_fao_evapotranspiration` (ETP), `uv_index_max`, `wind_speed_10m_max`.
3. `air_quality` (optionnel) pour UV index plus precis et conseils traitements.
4. Calculer : nuits avec gel (Tmin < 0), ETP cumulee, pluie cumulee, jours sans pluie consecutifs.
5. Rendre stat-cards, chart Tmin + precip, kv recommandations.

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
  daily: ['temperature_2m_min', 'precipitation_sum', 'et0_fao_evapotranspiration', 'uv_index_max', 'wind_speed_10m_max'],
  forecast_days: 7
}).catch(() => null);

if (!w?.daily?.time?.length) {
  await widget('text', { content: 'Donnees meteo indisponibles.' });
  return;
}

const d = w.daily;
const tmin = (d.temperature_2m_min ?? []).map(v => Number.isFinite(v) ? v : 0);
const rain = (d.precipitation_sum ?? []).map(v => Number.isFinite(v) ? v : 0);
const etpArr = (d.et0_fao_evapotranspiration ?? []).map(v => Number.isFinite(v) ? v : 0);
const uvArr = (d.uv_index_max ?? []).map(v => Number.isFinite(v) ? v : 0);
const wndArr = (d.wind_speed_10m_max ?? []).map(v => Number.isFinite(v) ? v : 0);

const frostNights = tmin.filter(t => t < 0).length;
const totalRain = rain.reduce((s, v) => s + v, 0);
const totalETP = etpArr.reduce((s, v) => s + v, 0);
let deficit = totalETP - totalRain;
if (Number.isNaN(deficit)) deficit = 0;
let dryRun = 0, maxDryRun = 0;
rain.forEach(p => { if (p < 0.5) { dryRun++; maxDryRun = Math.max(maxDryRun, dryRun); } else dryRun = 0; });

const advice = [];
if (frostNights > 0) advice.push(`Gel prevu ${frostNights} nuit(s) -- proteger plants sensibles`);
if (deficit > 10) advice.push(`Deficit hydrique ${deficit.toFixed(1)}mm -- arroser`);
else if (totalRain > 30) advice.push(`Pluie abondante ${totalRain.toFixed(1)}mm -- pas besoin d'arroser`);
if (maxDryRun >= 3) advice.push(`${maxDryRun}j consecutifs sans pluie -- fenetre de traitement OK`);
if (uvArr.length > 0 && Math.max(...uvArr) >= 8) advice.push('UV intense -- traiter tot matin ou soir');
if (wndArr.length > 0 && Math.max(...wndArr) > 30) advice.push('Vent fort prevu -- eviter pulverisation');

await widget('stat-card', {
  title: 'Jardin / agriculture - 7 jours',
  items: [
    { label: 'Nuits avec gel', value: String(frostNights), icon: 'snowflake' },
    { label: 'Pluie 7j', value: `${totalRain.toFixed(1)} mm`, icon: 'cloud-rain' },
    { label: 'ETP cumulee', value: `${totalETP.toFixed(1)} mm`, icon: 'sun' },
    { label: 'Deficit hydrique', value: `${deficit.toFixed(1)} mm`, icon: 'droplet' }
  ]
});

const chartDates = (d.time ?? []).filter(v => v != null);
await widget('chart-rich', {
  title: 'Tmin nocturne et precipitations',
  type: 'line',
  xAxis: { label: 'Date', data: chartDates },
  series: [
    { label: 'Tmin (C)', data: tmin, color: '#3498db' },
    { label: 'Pluie (mm)', data: rain, type: 'bar', color: '#27ae60' },
    { label: 'Seuil gel', data: chartDates.map(() => 0), color: '#e74c3c', style: 'dashed' }
  ]
});

await widget('kv', {
  title: 'Conseils',
  pairs: advice.length ? advice.map((s, i) => [`#${i+1}`, s]) : [['Statut', 'RAS, conditions normales']]
});
```

## Examples

### Vigne Bourgogne risque gel
Pipeline meme. Si `frostNights > 0` et stade vegetatif sensible, alerter explicitement.

### Marachage potager Lyon
Mettre en avant le deficit hydrique et les fenetres sans pluie.

## Common mistakes

- L'ETP (evapotranspiration potentielle) `et0_fao_evapotranspiration` est calculee selon FAO -- a utiliser pour irrigation, pas pour ETR
- Tmin a 2m peut sous-estimer le gel au sol (sol qui rayonne) -- ajouter une marge de 1-2C en zone exposee
- Un total de 30mm reparti en 1 jour != 30mm sur 7 jours -- toujours montrer la repartition
- Pour les traitements phyto, regarder les rafales max (`wind_gusts_10m`), pas seulement la moyenne
- L'UV `uv_index_max` est aux conditions claires -- nuageux = lecture surestimee
- Conseils trop generiques -- adapter selon culture si l'utilisateur la mentionne (vigne, mais, salades...)
