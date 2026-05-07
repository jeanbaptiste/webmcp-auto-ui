---
id: solar-energy-forecast
name: Prevision production solaire photovoltaique
description: Chart radiation globale + diffuse 5j, stat-cards kWh/m2 estimes et heures de soleil, kv inclinaison/azimut conseilles
when: l'utilisateur a un PV en autoconsommation, "production solaire prevue", "kWh attendus", planning d'usage energie
servers: [openmeteo]
tools_used: [geocoding, weather_forecast]
data_type: timeseries
components_used: [chart-rich, stat-card, kv]
layout:
  type: grid
  columns: 2
  arrangement: chart pleine largeur, stat-cards et kv dessous
---

## When to use

- "Quelle production solaire attendre cette semaine a Montpellier ?"
- "Mes panneaux PV vont produire combien demain a Avignon ?"
- "Bonne journee pour faire la machine a laver (autoconsommation) ?"
- "Heures pleines soleil sur 5 jours a Toulouse"
- "Inclinaison optimale pour ma toiture a Lyon"

Public croissant (prosumers PV) ; openmeteo expose des variables solaires riches.

## How to use

1. `geocoding({ name, count: 1 })`.
2. `weather_forecast` hourly 5 jours : `shortwave_radiation`, `direct_radiation`, `diffuse_radiation`, `cloud_cover`, `temperature_2m`. Daily : `sunshine_duration`, `shortwave_radiation_sum`.
3. Calculer kWh/m2/jour (W/m2 -> kWh/m2 = somme W/m2 sur 24h * 1h / 1000).
4. Inclinaison conseillee = latitude (regle de pouce annuelle).
5. Rendre chart, stat-cards, kv.

```js
const geo = await call('geocoding', { name: 'Montpellier', count: 1 });
const place = geo?.results?.[0];
if (!place) {
  await widget('text', { content: 'Ville introuvable.' });
  return;
}
const { latitude, longitude, timezone } = place;

const w = await call('weather_forecast', {
  latitude, longitude, timezone,
  hourly: ['shortwave_radiation', 'direct_radiation', 'diffuse_radiation', 'temperature_2m'],
  daily: ['sunshine_duration', 'shortwave_radiation_sum'],
  forecast_days: 5
}).catch(() => null);

if (!w?.daily?.time?.length) {
  await widget('text', { content: 'Donnees solaires indisponibles.' });
  return;
}

const radSums = (w.daily.shortwave_radiation_sum ?? []).filter(v => Number.isFinite(v));
const sunDur = (w.daily.sunshine_duration ?? []).filter(v => Number.isFinite(v));
const dailyKWh = radSums.map(v => v / 3.6); // MJ/m2 -> kWh/m2 (1 MJ = 1/3.6 kWh)
const totalKWh = dailyKWh.reduce((s, v) => s + v, 0);
const totalSunHours = sunDur.reduce((s, v) => s + v, 0) / 3600;
const optimalTilt = Math.round(latitude); // regle de pouce
const optimalAzimuth = latitude > 0 ? 'Sud (180°)' : 'Nord (0°)';
const bestIdx = dailyKWh.length > 0 ? dailyKWh.indexOf(Math.max(...dailyKWh)) : -1;
const days = dailyKWh.length || 1;

// Filtrer les heures de nuit (shortwave_radiation = 0) pour le chart
const hourlyRad = w.hourly?.shortwave_radiation ?? [];
const dayIdx = hourlyRad.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
const hourlyTime = w.hourly?.time ?? [];
const hourlyDirect = w.hourly?.direct_radiation ?? [];
const hourlyDiffuse = w.hourly?.diffuse_radiation ?? [];

// Configuration statique independante des donnees meteo — affichee en premier
await widget('kv', {
  title: 'Configuration optimale (regle de pouce annuelle)',
  rows: [
    ['Inclinaison conseillee', `${optimalTilt}°`],
    ['Azimut conseille', optimalAzimuth],
    ['Latitude', `${latitude.toFixed(2)}°`],
    ['Note', 'Inclinaison plus faible (latitude - 15°) optimise l\'ete ; plus forte (latitude + 15°) optimise l\'hiver']
  ]
});

await widget('chart-rich', {
  title: 'Radiation solaire 5 jours - Montpellier',
  type: 'line',
  labels: dayIdx.map(i => hourlyTime[i]),
  data: [
    { label: 'Globale (W/m2)', values: dayIdx.map(i => hourlyRad[i]), color: '#f39c12' },
    { label: 'Directe', values: dayIdx.map(i => hourlyDirect[i] ?? 0), color: '#e67e22' },
    { label: 'Diffuse', values: dayIdx.map(i => hourlyDiffuse[i] ?? 0), color: '#3498db' }
  ]
});

if (radSums.length > 0) {
  await widget('stat-card', {
    items: [
      { label: 'Energie 5j', value: Number.isFinite(totalKWh) ? `${totalKWh.toFixed(1)} kWh/m2` : '—', icon: 'sun' },
      { label: 'Soleil cumule', value: `${totalSunHours.toFixed(1)} h`, icon: 'clock' },
      { label: 'Meilleure journee', value: bestIdx >= 0 ? (w.daily.time?.[bestIdx] ?? '—') : '—', icon: 'star' },
      { label: 'kWh/m2/jour moyen', value: Number.isFinite(totalKWh) ? `${(totalKWh / days).toFixed(2)}` : '—', icon: 'trending-up' }
    ]
  });
}
```

## Examples

### Toulouse 7 jours
Pipeline meme avec `forecast_days: 7`.

### Inclinaison ete vs hiver
Calculer 2 inclinaisons (`tilt - 15` ete, `tilt + 15` hiver) ; afficher dans le kv.

## Common mistakes

- `shortwave_radiation_sum` est en MJ/m2 -- diviser par 3.6 pour avoir des kWh/m2 (ou par 1000 si W/m2 cumule)
- La production reelle = irradiation * surface * rendement (~17-22% pour silicium) * facteur de pertes (~85%)
- L'inclinaison "latitude" optimise l'ANNUEL ; pour autoconsommation ete, prendre `latitude - 15°`
- Ne pas oublier la temperature -- au-dessus de 25C, le rendement PV chute (~0.4%/C)
- Diffuse + directe != globale exactement (quelques W/m2 d'ecart selon le tilt)
- Ne pas afficher la nuit (W/m2 = 0 sur ~12h) -- tronquer le chart aux heures de jour
