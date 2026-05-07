---
id: heatwave-coldwave-detection
name: Detection canicule / vague de froid sur previsions et historique
description: Detecte sur forecast 16j les jours > 32C ou < -5C, timeline des episodes, chart Tmax avec seuil, stat-card duree
when: l'utilisateur demande "canicule a venir", "vague de froid", evenements extremes, alerte sante personnes vulnerables
servers: [openmeteo]
tools_used: [geocoding, weather_forecast, weather_archive]
data_type: timeseries
components_used: [chart-rich, timeline, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: chart pleine largeur, timeline + stat-cards dessous
---

## When to use

- "Y a-t-il une canicule prevue a Avignon ?"
- "Risque de vague de froid a Strasbourg cette semaine ?"
- "Combien de jours > 35C a Bordeaux dans les 2 prochaines semaines ?"
- "Episode caniculaire en cours ?"
- "Comparaison nb jours canicule cet ete vs 2003 a Lyon"

Alerte sante / securite, utile pour personnes vulnerables (agees, asthmatiques, jeunes enfants).

## How to use

1. `geocoding({ name, count: 1 })`.
2. `weather_forecast` 16 jours daily avec `temperature_2m_max`, `temperature_2m_min`.
3. Optionnellement `weather_archive` meme periode 30 ans pour le contexte historique.
4. Algorithme : episode = >= 3 jours consecutifs avec Tmax > 32 (canicule) ou Tmin < -5 (froid).
5. Rendre chart avec ligne de seuil, timeline des episodes detectes, stat-cards.

```js
const geo = await call('geocoding', { name: 'Avignon', count: 1 });
const place = geo?.results?.[0];
if (!place) {
  await widget('text', { content: 'Ville introuvable.' });
  return;
}
const { latitude, longitude, timezone } = place;

const w = await call('weather_forecast', {
  latitude, longitude, timezone,
  daily: ['temperature_2m_max', 'temperature_2m_min'],
  forecast_days: 16
}).catch(() => null);

if (!w?.daily?.time?.length) {
  await widget('text', { content: 'Donnees meteo indisponibles.' });
  return;
}

const heatThreshold = 32;
const coldThreshold = -5;

function detectEpisodes(values, threshold, mode) {
  const episodes = [];
  let start = -1;
  (values ?? []).forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const hit = mode === 'heat' ? v > threshold : v < threshold;
    if (hit && start < 0) start = i;
    else if (!hit && start >= 0) {
      if (i - start >= 3) episodes.push({ start, end: i - 1, length: i - start });
      start = -1;
    }
  });
  if (start >= 0 && (values?.length ?? 0) - start >= 3) episodes.push({ start, end: values.length - 1, length: values.length - start });
  return episodes;
}

const tmax = w.daily.temperature_2m_max ?? [];
const tmin = w.daily.temperature_2m_min ?? [];
const times = w.daily.time ?? [];
const heatEps = detectEpisodes(tmax, heatThreshold, 'heat');
const coldEps = detectEpisodes(tmin, coldThreshold, 'cold');
const heatDays = tmax.filter(t => Number.isFinite(t) && t > heatThreshold).length;

await widget('chart-rich', {
  title: 'Tmax 16j - seuil canicule (32 C)',
  type: 'line',
  labels: times,
  data: [
    { label: 'Tmax (C)', values: tmax, color: '#e74c3c' },
    { label: 'Seuil canicule', values: times.map(() => heatThreshold), color: '#f39c12' }
  ]
});

await widget('timeline', {
  title: 'Episodes detectes',
  events: [
    ...heatEps.map(e => ({
      date: times[e.start] ?? '',
      title: `Canicule ${e.length}j`,
      description: `${times[e.start] ?? '—'} -> ${times[e.end] ?? '—'}`,
      status: 'active'
    })),
    ...coldEps.map(e => ({
      date: times[e.start] ?? '',
      title: `Froid ${e.length}j`,
      description: `${times[e.start] ?? '—'} -> ${times[e.end] ?? '—'}`,
      status: 'pending'
    }))
  ].filter(e => e.title)
});

await widget('stat-card', {
  items: [
    { label: 'Jours > 32C', value: String(heatDays), icon: 'flame' },
    { label: 'Episodes canicule', value: String(heatEps.length), icon: 'alert-triangle' },
    { label: 'Plus long episode', value: heatEps.length > 0 ? `${Math.max(...heatEps.map(e => e.length))} jours` : '-', icon: 'clock' }
  ]
});
```

## Examples

### Avignon ete chaud
Pipeline ci-dessus ; 3 episodes en 16j = signal fort.

### Vague de froid Strasbourg
Inverser le seuil (`coldThreshold = -5`) et regarder Tmin nocturne.

## Common mistakes

- "Canicule" a une definition climatologique stricte (>= 3 jours consecutifs avec Tmax > seuil regional) -- 32C est un proxy, pas l'officiel
- Toujours preciser le seuil utilise dans le titre -- selon les regions, le seuil bouge (ex: 35C dans le sud, 30C dans le nord)
- Ne pas confondre `temperature_2m_max` (jour) et `temperature_2m_min` (nuit) -- canicule sur Tmax, froid sur Tmin
- 16 jours est la limite forecast -- au-dela, basculer sur `seasonal_forecast` (anomalies)
- Toujours afficher la ligne de seuil sur le chart -- le seul Tmax sans reference est moins parlant
- En l'absence d'episode detecte, l'afficher explicitement ("Aucun episode detecte sur 16j") plutot que des cards vides
