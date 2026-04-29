---
id: ensemble-uncertainty-band
name: Bande d'incertitude (ensemble forecast) avec probabilites
description: Chart avec bande min/max des membres d'ensemble, mediane, stat-cards spread max et probabilite pluie, contexte explicatif
when: l'utilisateur demande la fiabilite/incertitude d'une prevision, "probabilite de pluie", "a quel point on est surs", previsions J+5 a J+15
servers: [openmeteo]
tools_used: [geocoding, ensemble_forecast]
data_type: timeseries
components_used: [chart-rich, stat-card, text]
layout:
  type: grid
  columns: 2
  arrangement: chart pleine largeur, stat-cards + texte explicatif dessous
---

## When to use

- "Quelle est la probabilite de pluie a Lille jeudi prochain ?"
- "Fiabilite de la canicule annoncee a Bordeaux ?"
- "A quel point la prevision pour samedi est sure ?"
- "Bande d'incertitude pour la T de J+10 a Lyon"
- "Risque de pluie le week-end du 15 ?"

Indispensable au-dela de J+5. Le forecast deterministe seul est trompeur a long horizon.

## How to use

1. `geocoding({ name, count: 1 })`.
2. `ensemble_forecast` avec `hourly: [temperature_2m, precipitation]` et `forecast_days: 14` -- la reponse contient des series par membre (`temperature_2m_member01`, `..._member02`, etc.) ou un wrapper.
3. Pour chaque pas de temps, calculer min/max/mediane/spread sur les membres.
4. Compter pourcentage de membres avec precipitation > 5mm pour la "probabilite de pluie".
5. Rendre chart-rich (3 series : min, mediane, max), stat-cards et texte.

```js
const geo = await call('geocoding', { name: 'Lille', count: 1 });
const { latitude, longitude, timezone } = geo.results[0];

const e = await call('ensemble_forecast', {
  latitude, longitude, timezone,
  hourly: ['temperature_2m', 'precipitation'],
  forecast_days: 14
});

// e.hourly contient temperature_2m_member01..N + temperature_2m (controle)
const memberKeys = Object.keys(e.hourly).filter(k => k.startsWith('temperature_2m_member'));
const N = e.hourly.time.length;

const stats = e.hourly.time.map((t, i) => {
  const vals = memberKeys.map(k => e.hourly[k][i]).filter(v => v != null);
  const sorted = [...vals].sort((a, b) => a - b);
  return {
    time: t,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)]
  };
});

const precipKeys = Object.keys(e.hourly).filter(k => k.startsWith('precipitation_member'));
const probRain5mm = e.hourly.time.map((_, i) => {
  const vals = precipKeys.map(k => e.hourly[k][i]);
  return vals.filter(v => v > 5).length / vals.length * 100;
});

const maxSpread = Math.max(...stats.map(s => s.max - s.min));
const idxMaxSpread = stats.findIndex(s => s.max - s.min === maxSpread);
const peakRainProb = Math.max(...probRain5mm);

await widget('chart-rich', {
  title: 'Temperature - bande d\'incertitude (ensemble)',
  type: 'line',
  xAxis: { label: 'Heure', data: stats.map(s => s.time) },
  series: [
    { label: 'Max membres', data: stats.map(s => s.max), color: '#e74c3c' },
    { label: 'Mediane', data: stats.map(s => s.median), color: '#2c3e50' },
    { label: 'Min membres', data: stats.map(s => s.min), color: '#3498db' }
  ]
});

await widget('stat-card', {
  items: [
    { label: 'Spread max', value: `${maxSpread.toFixed(1)} C`, icon: 'activity' },
    { label: 'Pic incertitude', value: stats[idxMaxSpread].time.slice(0, 10), icon: 'calendar' },
    { label: 'Prob. pluie > 5mm', value: `${peakRainProb.toFixed(0)}%`, icon: 'cloud-rain' }
  ]
});

await widget('text', {
  content: `Une prevision d'ensemble lance plusieurs simulations avec des conditions initiales legerement perturbees. Quand les membres convergent, la prevision est fiable. Quand ils divergent (spread > 4C), l'incertitude est forte : il faut attendre une mise a jour.`
});
```

## Examples

### Probabilite pluie samedi a Lille
Filtrer `stats` sur le jour cible ; afficher uniquement la fenetre de 24h dans un mini-chart.

### Canicule en doute a Marseille
Calculer la fraction de membres > 35C ; si < 50%, le pic est incertain.

## Common mistakes

- Ne pas confondre ensemble (1 modele, plusieurs membres) avec multi-modeles (plusieurs modeles independants)
- Compter les membres dynamiquement -- le nombre varie selon le modele (51 pour ECMWF-ENS, 31 pour GEPS)
- Ne pas afficher la moyenne arithmetique -- la mediane est plus robuste aux outliers
- Le spread n'est pas symetrique : la queue chaude/froide peut etre plus longue d'un cote
- 14 jours est le max utile pour l'ensemble -- au-dela utiliser `seasonal_forecast`
- Ne pas oublier la bande d'incertitude visuelle -- une seule ligne mediane perd l'info principale
