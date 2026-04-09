---
id: weather-viz
name: Visualisation meteo
components_used: [stat-card, chart-rich, map, kv]
when: donnees meteo (temperature, vent, precipitations, previsions)
servers: [open-meteo, weatherapi]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards en haut, chart en bas sur toute la largeur
---

## Quand utiliser
Les donnees MCP contiennent des mesures meteorologiques : temperature, humidite, vent, precipitations, previsions horaires ou journalieres.

## Comment
1. Appeler l'outil DATA pour recuperer les donnees meteo
2. Extraire les KPIs principaux et les afficher avec `component("stat-card", ...)`
3. Si des series temporelles sont presentes, utiliser `component("chart-rich", ...)` avec type "line"
4. Si des coordonnees sont presentes, ajouter `component("map", ...)` avec un marqueur
5. Pour les details supplementaires, utiliser `component("kv", ...)`

## Exemple

Open-Meteo retourne des previsions horaires :
```json
{
  "current": {"temperature_2m": 18.5, "wind_speed_10m": 12.3},
  "hourly": {"time": [...], "temperature_2m": [...]}
}
```

→ `component("stat-card", {label: "Temperature", value: "18.5°C", icon: "thermometer"})`
→ `component("stat-card", {label: "Vent", value: "12.3 km/h", icon: "wind"})`
→ `component("chart-rich", {type: "line", labels: hourly.time, datasets: [{label: "Temp °C", data: hourly.temperature_2m}]})`

## Erreurs courantes
- Afficher les donnees brutes JSON au lieu de les visualiser
- Ne pas convertir les unites (Kelvin → Celsius, m/s → km/h)
- Oublier les stat-cards pour les KPIs principaux
