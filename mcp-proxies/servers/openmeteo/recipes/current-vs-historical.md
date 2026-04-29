---
id: current-vs-historical
name: Comparaison meteo actuelle vs normale climatologique 30 ans
description: Forecast actuel + archive 30 ans meme periode, chart courbe actuelle vs moyenne, stat-card "ecart vs normale"
when: l'utilisateur demande "anomalie de temperature", "ce mois est-il chaud par rapport a la normale", changement climatique local
servers: [openmeteo]
tools_used: [geocoding, weather_forecast, weather_archive]
data_type: comparison
components_used: [chart-rich, stat-card, text]
layout:
  type: grid
  columns: 1
  arrangement: chart pleine largeur, stat-cards et texte dessous
---

## When to use

- "Avril 2026 a Paris est-il plus chaud que la normale ?"
- "Cette semaine vs moyenne climatologique a Lyon"
- "Ce mois-ci est-il anormal a Bordeaux ?"
- "Anomalie temperature en cours a Marseille"
- "Mon ressenti que ca se rechauffe est-il vrai ?"

Met en perspective la meteo actuelle face au climat de reference (typiquement 1991-2020).

## How to use

1. `geocoding({ name, count: 1 })`.
2. En parallele : `weather_forecast` (16 jours daily) ET `weather_archive` sur la meme fenetre calendaire pour les 30 dernieres annees (ex: 1995-2024 si on est en 2026).
3. Calculer la moyenne climatologique jour par jour.
4. Calculer l'ecart actuel vs cette moyenne.
5. Rendre chart 2 series + ecart, stat-card, texte.

```js
const geo = await call('geocoding', { name: 'Paris', count: 1 });
const place = geo?.results?.[0];
if (!place) {
  await widget('text', { content: 'Ville introuvable.' });
  return;
}
const { latitude, longitude, timezone } = place;

// Periode actuelle : 16 prochains jours
const today = new Date().toISOString().slice(0, 10);
const todayD = new Date();
const endD = new Date(todayD); endD.setDate(endD.getDate() + 15);
const endStr = endD.toISOString().slice(0, 10);

const [now, archive] = await Promise.all([
  call('weather_forecast', {
    latitude, longitude, timezone,
    daily: ['temperature_2m_mean', 'temperature_2m_max', 'temperature_2m_min'],
    forecast_days: 16
  }).catch(() => null),
  call('weather_archive', {
    latitude, longitude, timezone,
    start_date: '1995-01-01',
    end_date: '2024-12-31',
    daily: ['temperature_2m_mean']
  }).catch(() => null)
]);

if (!now?.daily?.time?.length || !archive?.daily?.time?.length) {
  await widget('text', { content: 'Donnees indisponibles (forecast ou archive).' });
  return;
}

// Moyenne climatologique pour chaque MM-DD de la periode actuelle
function dayKey(d) { return d.slice(5); } // MM-DD
const climByDay = {};
const archTimes = archive.daily.time ?? [];
const archMeans = archive.daily.temperature_2m_mean ?? [];
archTimes.forEach((t, i) => {
  const v = archMeans[i];
  if (!Number.isFinite(v)) return;
  const k = dayKey(t);
  (climByDay[k] = climByDay[k] || []).push(v);
});

const nowTimes = now.daily.time ?? [];
const nowMeans = now.daily.temperature_2m_mean ?? [];
const climSeries = nowTimes.map(t => {
  const arr = climByDay[dayKey(t)] || [];
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
});

const anomalies = nowMeans.map((t, i) => climSeries[i] != null && Number.isFinite(t) ? t - climSeries[i] : null).filter(v => v != null);
const meanAnom = anomalies.length > 0 ? anomalies.reduce((s, v) => s + v, 0) / anomalies.length : 0;

await widget('chart-rich', {
  title: 'Tmoy actuelle vs normale 1995-2024 - Paris',
  type: 'line',
  xAxis: { label: 'Date', data: nowTimes },
  series: [
    { label: 'Tmoy actuelle (C)', data: nowMeans, color: '#e74c3c' },
    { label: 'Normale 30 ans (C)', data: climSeries.map(v => v == null ? null : Number(v.toFixed(2))), color: '#bdc3c7', dashed: true }
  ]
});

await widget('stat-card', {
  items: [
    { label: 'Anomalie moyenne', value: anomalies.length > 0 ? `${meanAnom >= 0 ? '+' : ''}${meanAnom.toFixed(2)} C` : '—', icon: 'trending-up' },
    { label: 'Anomalie max', value: anomalies.length > 0 ? `${Math.max(...anomalies).toFixed(2)} C` : '—', icon: 'flame' },
    { label: 'Anomalie min', value: anomalies.length > 0 ? `${Math.min(...anomalies).toFixed(2)} C` : '—', icon: 'snowflake' }
  ]
});

await widget('text', {
  content: `La normale climatologique est calculee sur 1995-2024 (30 ans). Une anomalie persistante > +2C indique un episode chaud notable. Les normales OMM officielles sont calculees sur 1991-2020 ou 1961-1990.`
});
```

## Examples

### Avril 2026 vs normales Paris
Pipeline ci-dessus. Si `meanAnom > +3C`, ajouter un text en alerte.

### Comparer hiver actuel a hiver climatologique a Lyon
Meme pipeline, mais filtrer sur dec-fev.

## Common mistakes

- 30 ans est le standard OMM -- ne pas se contenter de 5 ou 10 ans (signal/bruit insuffisant)
- Toujours comparer JOUR PAR JOUR (MM-DD), pas mois par mois -- sinon on rate le profil saisonnier
- Ne pas confondre `temperature_2m_mean` (moyenne quotidienne) et `temperature_2m_max` (maximum)
- L'archive ERA5 et le forecast ne sont pas exactement la meme physique -- attendez-vous a un biais residuel de 0.1-0.3C
- Toujours afficher la normale ET l'actuelle -- "anomalie +2C" sans contexte est cryptique
- Pour des anomalies historiques (ex: ete 2003), utiliser la recette `historical-archive-year` plutot
