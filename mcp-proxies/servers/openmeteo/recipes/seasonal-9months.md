---
id: seasonal-9months
name: Previsions saisonnieres sur 9 mois (anomalies T et precipitations)
description: Chart anomalies T et pluies mois par mois sur 9 mois, table mensuelle, stat-cards "anomalie pic"
when: l'utilisateur demande "ete a venir sera-t-il chaud", planning saisonnier agricole/touristique, prevision a horizon mois
servers: [openmeteo]
tools_used: [geocoding, seasonal_forecast]
data_type: timeseries
components_used: [chart-rich, table, stat-card]
layout:
  type: grid
  columns: 1
  arrangement: chart pleine largeur, table mensuelle dessous, stat-cards en bas
---

## When to use

- "Comment s'annonce l'ete dans le Sud-Ouest ?"
- "Hiver doux ou rigoureux a Lyon ?"
- "Prevision saisonniere agricole Champagne"
- "Tendance sur les 6 prochains mois a Bordeaux"
- "Saison touristique sera-t-elle pluvieuse en Provence ?"

Decision agricole, planification touristique grande saison, contrats meteo.

## How to use

1. `geocoding({ name, count: 1 })`.
2. `seasonal_forecast` avec `six_hourly: [temperature_2m]` et `forecast_days: 270` (9 mois). Le tool renvoie des series 6-hourly avec 50 membres.
3. Resampler en moyennes mensuelles, comparer a la climatologie (idealement via `weather_archive` separe -- sinon utiliser un baseline embarque).
4. Rendre chart anomalies, table, stat-cards.

```js
const geo = await call('geocoding', { name: 'Bordeaux', count: 1 });
const place = geo?.results?.[0];
if (!place) {
  await widget('text', { content: 'Ville introuvable.' });
  return;
}
const { latitude, longitude, timezone } = place;

const s = await call('seasonal_forecast', {
  latitude, longitude,
  six_hourly: ['temperature_2m'],
  forecast_days: 270
}).catch(() => null);

if (!s?.six_hourly?.time?.length) {
  await widget('text', { content: 'Donnees saisonnieres indisponibles.' });
  return;
}

// Mediane sur les membres puis moyenne mensuelle
const sh = s.six_hourly;
const memberKeys = Object.keys(sh).filter(k => k.startsWith('temperature_2m_member'));
const medianSeries = sh.time.map((_, i) => {
  const vals = memberKeys.map(k => sh[k]?.[i]).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  return vals.length > 0 ? vals[Math.floor(vals.length / 2)] : null;
});

const monthly = {};
sh.time.forEach((t, i) => {
  const v = medianSeries[i];
  if (!Number.isFinite(v)) return;
  const m = t.slice(0, 7);
  (monthly[m] = monthly[m] || []).push(v);
});
const months = Object.entries(monthly).map(([m, arr]) => ({
  month: m, t: arr.reduce((a, b) => a + b, 0) / arr.length
}));

if (months.length === 0) {
  await widget('text', { content: 'Aucune donnee saisonniere exploitable.' });
  return;
}

// Climatologie locale tres simplifiee (a remplacer par appel weather_archive en prod)
const climato = months.map(m => ({ month: m.month, normal: 14 + 8 * Math.cos((parseInt(m.month.slice(5)) - 7) * Math.PI / 6) }));
const anomalies = months.map((m, i) => ({ month: m.month, t: m.t, normal: climato[i].normal, anomaly: m.t - climato[i].normal }));

const peak = anomalies.reduce((a, b) => Math.abs(a.anomaly) > Math.abs(b.anomaly) ? a : b);

await widget('chart-rich', {
  title: 'Tendance saisonniere 9 mois - Bordeaux',
  type: 'line',
  xAxis: { label: 'Mois', data: anomalies.map(a => a.month) },
  series: [
    { label: 'Tmoy prevue', data: anomalies.map(a => a.t.toFixed(1)), color: '#e74c3c' },
    { label: 'Normale', data: anomalies.map(a => a.normal.toFixed(1)), color: '#bdc3c7', dashed: true }
  ]
});

await widget('table', {
  columns: ['Mois', 'Tmoy prevue', 'Normale', 'Anomalie'],
  rows: anomalies.map(a => [a.month, `${a.t.toFixed(1)}C`, `${a.normal.toFixed(1)}C`, `${a.anomaly >= 0 ? '+' : ''}${a.anomaly.toFixed(1)}C`])
});

await widget('stat-card', {
  items: [
    { label: 'Anomalie pic', value: `${peak.anomaly >= 0 ? '+' : ''}${peak.anomaly.toFixed(1)}C en ${peak.month}`, icon: 'thermometer' },
    { label: 'Mois le plus chaud', value: anomalies.reduce((a, b) => a.t > b.t ? a : b).month, icon: 'sun' }
  ]
});
```

## Examples

### Ete sud-ouest
Filtrer `anomalies` sur juin-aout uniquement ; afficher 3 stat-cards (juin, juillet, aout).

### Hiver Champagne
Filtrer dec-fev ; ajouter risque de gel via `weather_archive` croise.

## Common mistakes

- Les previsions saisonnieres sont des TENDANCES probabilistes, jamais des valeurs deterministes -- toujours indiquer l'incertitude
- Ne pas afficher la serie 6-hourly brute (1080 points) -- toujours resampler en mensuel
- Le baseline climatologique simple (sinusoide) ci-dessus est INDICATIF -- en prod, croiser avec un appel `weather_archive` 30 ans
- L'horizon utile est 3 a 6 mois ; au-dela les anomalies tendent vers 0
- Les modeles saisonniers sont moins fiables sur les precipitations que sur les temperatures
- Toujours afficher l'anomalie ET la valeur absolue -- "+2C" ne dit rien sans la T de reference
