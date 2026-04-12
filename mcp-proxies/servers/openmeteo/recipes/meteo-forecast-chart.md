---
name: meteo-forecast-chart
description: Affiche les previsions meteo d'une ville sous forme de graphique temporel (ligne ou barres)
data_type: timeseries
tools_used:
  - geocoding
  - weather_forecast
---

## Quand utiliser

L'utilisateur demande des previsions meteo pour une ville sur plusieurs jours, un graphique de temperatures, l'evolution de la meteo, ou toute visualisation temporelle de donnees meteorologiques (temperature, precipitation, vent).

## Pipeline

1. Appeler `geocoding({name: "Paris", count: 1})` pour resoudre le nom de ville en coordonnees. Le resultat contient `{results: [{latitude, longitude, name, country, timezone}]}`.
2. Extraire `latitude`, `longitude` et `timezone` du premier resultat.
3. Appeler `weather_forecast({latitude, longitude, hourly: ["temperature_2m", "precipitation", "wind_speed_10m"], daily: ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"], forecast_days: 7, timezone})`.
4. Le resultat contient `{hourly: {time: string[], temperature_2m: number[], precipitation: number[], wind_speed_10m: number[]}, daily: {time: string[], temperature_2m_max: number[], temperature_2m_min: number[]}}`.
5. Choisir la granularite selon le besoin : `hourly` pour les prochaines 24-48h, `daily` pour 7 jours.
6. Transformer les tableaux en series pour le graphique : chaque serie = `{label, data: [{x: time, y: value}]}`.
7. Afficher avec `autoui_webmcp_widget_display({name: "chart-rich", params: {title: "...", type: "line", ...}})`.

## Exemple complet

### Requete utilisateur
> "Montre-moi les previsions meteo de Paris sur 7 jours"

### Appel geocoding
```json
{"tool": "geocoding", "arguments": {"name": "Paris", "count": 1}}
```

### Resultat geocoding (extrait)
```json
{
  "results": [
    {"latitude": 48.8566, "longitude": 2.3522, "name": "Paris", "country": "France", "timezone": "Europe/Paris"}
  ]
}
```

### Appel weather_forecast
```json
{
  "tool": "weather_forecast",
  "arguments": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
    "forecast_days": 7,
    "timezone": "Europe/Paris"
  }
}
```

### Resultat weather_forecast (extrait)
```json
{
  "daily": {
    "time": ["2026-04-12", "2026-04-13", "2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17", "2026-04-18"],
    "temperature_2m_max": [18.2, 19.5, 17.8, 16.1, 20.3, 21.0, 19.7],
    "temperature_2m_min": [8.1, 9.3, 8.7, 7.2, 10.1, 11.5, 10.8],
    "precipitation_sum": [0.0, 1.2, 5.4, 0.3, 0.0, 0.0, 2.1]
  }
}
```

### Affichage
```json
autoui_webmcp_widget_display({
  name: "chart-rich",
  params: {
    title: "Previsions meteo - Paris (7 jours)",
    type: "line",
    xAxis: {label: "Date", data: ["2026-04-12", "2026-04-13", "2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17", "2026-04-18"]},
    series: [
      {label: "Temp. max (C)", data: [18.2, 19.5, 17.8, 16.1, 20.3, 21.0, 19.7], color: "#e74c3c"},
      {label: "Temp. min (C)", data: [8.1, 9.3, 8.7, 7.2, 10.1, 11.5, 10.8], color: "#3498db"},
      {label: "Precipitation (mm)", data: [0.0, 1.2, 5.4, 0.3, 0.0, 0.0, 2.1], type: "bar", color: "#95a5a6"}
    ]
  }
})
```

## Erreurs courantes

- Ne JAMAIS hardcoder les coordonnees -- toujours passer par `geocoding` d'abord pour resoudre le nom de ville
- Toujours passer le `timezone` du resultat geocoding a `weather_forecast`, sinon les heures seront en UTC
- Le parametre `forecast_days` accepte 1 a 16 jours maximum -- ne pas depasser 16
- Pour les graphiques hourly, limiter a 48-72h pour la lisibilite -- au-dela, preferer daily
- Les unites par defaut sont metriques (Celsius, mm, km/h) -- ne pas convertir sauf demande explicite
- `hourly` et `daily` sont des listes de noms de variables, pas des booleens -- passer les noms exacts
