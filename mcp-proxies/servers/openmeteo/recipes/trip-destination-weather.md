---
id: trip-destination-weather
name: Meteo destination de voyage avec conseils valise
description: Chart daily destination J+1 a J+15, stat-cards (T moyenne, jours pluvieux), kv conseils valise, carte ville
when: l'utilisateur prepare un voyage, "meteo destination dans X jours", "qu'est-ce que je mets dans la valise"
servers: [openmeteo]
tools_used: [geocoding, weather_forecast]
data_type: timeseries
components_used: [chart-rich, stat-card, kv, map]
layout:
  type: grid
  columns: 2
  arrangement: chart en haut, stat-cards + kv au milieu, carte en bas
---

## When to use

- "Je pars a Rome dans 10 jours, quel temps il fera ?"
- "Meteo Lisbonne semaine prochaine pour mon voyage"
- "Que prendre dans ma valise pour Berlin la semaine du 15 ?"
- "Voyage Marrakech, conditions a prevoir"
- "Va-t-il pleuvoir a Amsterdam pendant mes vacances ?"

Cas d'usage voyageur le plus frequent ; combine projection meteo + recommandation pratique.

## How to use

1. `geocoding({ name, count: 1 })`.
2. `weather_forecast` daily 15 jours avec Tmax/Tmin/precip/wind/uv.
3. Calculer T moyenne periode, jours pluvieux (precip > 1mm), jour le plus chaud / froid.
4. Generer conseils valise heuristiques : T < 5C -> manteau chaud + bonnet ; T 5-15 -> manteau leger + pull ; T 15-22 -> veste mi-saison ; T > 22 -> tenue legere ; pluie > 30% jours -> impermeable.
5. Rendre chart, stat-cards, kv conseils, carte.

```js
const geo = await call('geocoding', { name: 'Rome', count: 1 });
const place = geo?.results?.[0];
if (!place) {
  await widget('text', { content: 'Destination introuvable.' });
  return;
}
const { latitude, longitude, timezone, name, country } = place;

const w = await call('weather_forecast', {
  latitude, longitude, timezone,
  daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'precipitation_probability_max', 'uv_index_max'],
  forecast_days: 15
}).catch(() => null);

if (!w?.daily?.time?.length) {
  await widget('text', { content: 'Donnees meteo indisponibles.' });
  return;
}

const d = w.daily;
const tmaxArr = (d.temperature_2m_max ?? []).map(v => Number.isFinite(v) ? v : null);
const tminArr = (d.temperature_2m_min ?? []).map(v => Number.isFinite(v) ? v : null);
const tMeanPairs = tmaxArr.map((mx, i) => (mx != null && tminArr[i] != null) ? (mx + tminArr[i]) / 2 : null).filter(v => v != null);
const tMean = tMeanPairs.length > 0 ? tMeanPairs.reduce((s, v) => s + v, 0) / tMeanPairs.length : null;
const rainyDays = (d.precipitation_sum ?? []).filter(p => Number.isFinite(p) && p > 1).length;
const uvArr = (d.uv_index_max ?? []).filter(v => Number.isFinite(v));
const peakUV = uvArr.length > 0 ? Math.max(...uvArr) : null;
const tmaxFinite = tmaxArr.filter(v => v != null);
const tminFinite = tminArr.filter(v => v != null);
const tMaxAbs = tmaxFinite.length > 0 ? Math.max(...tmaxFinite) : null;
const tMinAbs = tminFinite.length > 0 ? Math.min(...tminFinite) : null;
const totalDays = (d.time ?? []).length;

const suitcase = [];
if (tMean != null) {
  if (tMean < 5) suitcase.push('Manteau chaud, bonnet, gants, couches polaires');
  else if (tMean < 15) suitcase.push('Manteau leger ou veste, pull(s)');
  else if (tMean < 22) suitcase.push('Veste mi-saison, manches longues');
  else suitcase.push('Tenues legeres, T-shirts, shorts');
}
if (rainyDays >= 3) suitcase.push('Impermeable / parapluie');
if (peakUV != null && peakUV >= 6) suitcase.push('Lunettes de soleil, creme solaire (UV ' + peakUV.toFixed(0) + ')');
if (tMaxAbs != null && tMinAbs != null && tMaxAbs - tMinAbs > 15) suitcase.push('Vetements pour ecarts T jour/nuit');

await widget('chart-rich', {
  title: `Voyage a ${name ?? ''}, ${country ?? ''} - 15 jours`,
  type: 'line',
  xAxis: { label: 'Date', data: d.time ?? [] },
  series: [
    { label: 'Tmax (C)', data: d.temperature_2m_max ?? [], color: '#e74c3c' },
    { label: 'Tmin (C)', data: d.temperature_2m_min ?? [], color: '#3498db' },
    { label: 'Pluie (mm)', data: d.precipitation_sum ?? [], type: 'bar', color: '#95a5a6' }
  ]
});

await widget('stat-card', {
  stats: [
    { label: 'T moyenne', value: tMean != null ? `${tMean.toFixed(1)}C` : '—', icon: 'thermometer' },
    { label: 'Jours pluvieux', value: `${rainyDays}/${totalDays}`, icon: 'cloud-rain' },
    { label: 'UV max', value: peakUV != null ? `${peakUV.toFixed(0)}` : '—', icon: 'sun' },
    { label: 'Amplitude', value: (tMinAbs != null && tMaxAbs != null) ? `${tMinAbs.toFixed(0)} -> ${tMaxAbs.toFixed(0)}C` : '—', icon: 'activity' }
  ]
});

await widget('kv', {
  title: 'Conseils valise',
  pairs: suitcase.length > 0 ? suitcase.map((s, i) => [`${i + 1}`, s]) : [['—', 'Donnees insuffisantes']]
});

await widget('map', {
  title: name ?? '',
  center: { lat: latitude, lng: longitude }, zoom: 10,
  markers: [{ lat: latitude, lng: longitude, label: name ?? '' }]
});
```

## Examples

### Rome 10 jours
Pipeline ci-dessus -- ajouter dans le kv "billet d'avion : ..." si l'utilisateur le mentionne (sortie de scope meteo).

### Lisbonne hiver
Pipeline meme, conseils valise s'adaptent automatiquement (T 8-15C -> manteau leger + impermeable).

## Common mistakes

- 15-16 jours = limite forecast deterministe ; au-dela, croiser avec `seasonal_forecast`
- L'incertitude J+12 a J+15 est elevee -- toujours rappeler que la fiabilite decroit
- Ne pas oublier le climat humide vs sec -- une T de 25C a Lisbonne (atlantique) ressent != 25C a Marrakech (sec)
- Les conseils valise sont des heuristiques -- adapter selon activite (rando, plage, ville)
- Toujours convertir le pays via le champ `country` du geocoding -- evite des homonymes (Rome NY vs Rome Italie)
- Pour activite specifique (ski, plage), affiner avec recettes dediees (`mountain-summit-conditions`, `marine-sailing-forecast`)
