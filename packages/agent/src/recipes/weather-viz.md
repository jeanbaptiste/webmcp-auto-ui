---
id: visualiser-previsions-meteo-avec-graphiques-et-kpi
name: Visualiser des previsions meteo avec graphiques temporels et indicateurs cles
components_used: [stat-card, chart-rich, map, kv]
when: les donnees MCP contiennent des mesures meteorologiques (temperature, humidite, vent, precipitations) ou des previsions horaires/journalieres
servers: [openmeteo]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards en haut, chart en bas sur toute la largeur
---

## Quand utiliser

Les resultats MCP contiennent des donnees meteorologiques structurees. Typiquement :
- **Open-Meteo** : previsions horaires (`hourly.temperature_2m`, `hourly.precipitation`), previsions journalieres (`daily.temperature_2m_max/min`), conditions actuelles (`current.temperature_2m`, `current.wind_speed_10m`)
- Toute source retournant des series temporelles de mesures climatiques

La recette s'applique meme pour une seule ville : les stat-cards montrent les conditions actuelles, le graphique montre l'evolution.

## Comment

1. **Appeler l'outil meteo** avec les coordonnees ou le nom de la ville :
   - Open-Meteo : `get_forecast({latitude: 48.85, longitude: 2.35, hourly: "temperature_2m,precipitation", daily: "temperature_2m_max,temperature_2m_min"})`
2. **Extraire les KPIs actuels** et les afficher en stat-cards :
   - Temperature actuelle : `component("stat-card", {label: "Temperature", value: "18.5°C", icon: "thermometer"})`
   - Vent : `component("stat-card", {label: "Vent", value: "12.3 km/h", icon: "wind"})`
   - Humidite : `component("stat-card", {label: "Humidite", value: "72%", icon: "droplets"})`
   - Precipitations : `component("stat-card", {label: "Pluie (24h)", value: "2.1 mm", icon: "cloud-rain"})`
3. **Construire le graphique temporel** a partir des series horaires ou journalieres :
   - `component("chart-rich", {type: "line", labels: hourly.time, datasets: [{label: "Temperature °C", data: hourly.temperature_2m}]})`
   - Pour les precipitations, preferer un type "bar" superpose
4. **Ajouter la carte** si des coordonnees sont disponibles :
   - `component("map", {center: [lat, lon], zoom: 10, markers: [{lat, lon, label: "Paris"}]})`
5. **Completer avec les details** en kv :
   - `component("kv", {pairs: [["Lever du soleil", "06:42"], ["Coucher", "20:15"], ["Indice UV", "5 (modere)"]]})`

## Exemples

### Previsions 7 jours pour Paris
```
// Appel MCP
get_forecast({latitude: 48.8566, longitude: 2.3522, daily: "temperature_2m_max,temperature_2m_min,precipitation_sum"})

// Rendu
component("stat-card", {label: "Aujourd'hui", value: "22°C / 14°C", icon: "thermometer"})
component("stat-card", {label: "Pluie prevue", value: "0 mm", icon: "sun"})
component("chart-rich", {
  type: "line",
  labels: daily.time,  // ["2026-04-09", "2026-04-10", ...]
  datasets: [
    {label: "Max °C", data: daily.temperature_2m_max},
    {label: "Min °C", data: daily.temperature_2m_min}
  ]
})
```

### Previsions horaires avec precipitations
```
component("chart-rich", {
  type: "line",
  labels: hourly.time.slice(0, 24),
  datasets: [
    {label: "Temperature °C", data: hourly.temperature_2m.slice(0, 24), yAxisID: "y"},
    {label: "Pluie mm", data: hourly.precipitation.slice(0, 24), yAxisID: "y1", type: "bar"}
  ]
})
```

## Erreurs courantes

- **Afficher les donnees brutes JSON** au lieu de les visualiser avec des composants
- **Ne pas convertir les unites** : Open-Meteo retourne en unites SI par defaut (m/s pour le vent → convertir en km/h si l'utilisateur est francophone)
- **Oublier les stat-cards** pour les KPIs principaux : un graphique seul ne donne pas les chiffres cles immediatement
- **Trop de points sur le graphique** : pour des previsions horaires sur 7 jours (168 points), preferer un resample journalier ou limiter a 48h en mode horaire
