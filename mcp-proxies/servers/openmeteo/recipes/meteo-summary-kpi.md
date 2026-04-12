---
name: meteo-summary-kpi
description: Affiche les conditions meteo actuelles sous forme de carte KPI (stat-card)
data_type: stat_card
tools_used:
  - weather_forecast
---

## Quand utiliser

L'utilisateur demande la meteo actuelle, les conditions en cours, la temperature maintenant, ou un resume rapide des conditions meteorologiques d'un lieu. Ideal pour un affichage compact type tableau de bord.

## Pipeline

1. Si l'utilisateur donne un nom de ville (pas des coordonnees), appeler d'abord `geocoding({name: "Ville", count: 1})` pour obtenir `latitude`, `longitude` et `timezone`.
2. Appeler `weather_forecast({latitude, longitude, current_weather: true, timezone})`.
3. Le resultat contient `{current_weather: {temperature, windspeed, winddirection, weathercode, time}}`.
4. Decoder le `weathercode` en description et emoji :
   - 0 = Ciel degage (soleil)
   - 1 = Principalement degage
   - 2 = Partiellement nuageux
   - 3 = Couvert
   - 45, 48 = Brouillard
   - 51, 53, 55 = Bruine
   - 61, 63, 65 = Pluie
   - 71, 73, 75 = Neige
   - 80, 81, 82 = Averses
   - 95, 96, 99 = Orage
5. Decoder la direction du vent : `winddirection` en degres → cardinal (0=N, 90=E, 180=S, 270=O).
6. Afficher avec `autoui_webmcp_widget_display({name: "stat-card", params: {items: [...]}})`.

## Exemple complet

### Requete utilisateur
> "Quelle est la meteo actuelle a Paris ?"

### Appel geocoding
```json
{"tool": "geocoding", "arguments": {"name": "Paris", "count": 1}}
```

### Resultat geocoding
```json
{"results": [{"latitude": 48.8566, "longitude": 2.3522, "name": "Paris", "timezone": "Europe/Paris"}]}
```

### Appel weather_forecast
```json
{
  "tool": "weather_forecast",
  "arguments": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "current_weather": true,
    "timezone": "Europe/Paris"
  }
}
```

### Resultat weather_forecast
```json
{
  "latitude": 48.86,
  "longitude": 2.35,
  "current_weather": {
    "temperature": 16.5,
    "windspeed": 12.3,
    "winddirection": 225,
    "weathercode": 2,
    "time": "2026-04-12T14:00"
  }
}
```

### Affichage
```json
autoui_webmcp_widget_display({
  name: "stat-card",
  params: {
    title: "Meteo actuelle - Paris",
    items: [
      {label: "Temperature", value: "16.5C", icon: "thermometer"},
      {label: "Conditions", value: "Partiellement nuageux", icon: "cloud-sun"},
      {label: "Vent", value: "12.3 km/h SO", icon: "wind"},
      {label: "Mis a jour", value: "14:00", icon: "clock"}
    ]
  }
})
```

## Erreurs courantes

- Ne JAMAIS afficher le `weathercode` brut (ex: "2") -- toujours le decoder en texte lisible
- Toujours convertir `winddirection` en cardinal (N, NE, E, SE, S, SO, O, NO) -- les degres seuls ne sont pas parlants
- `current_weather: true` est un booleen, pas un tableau de variables comme `hourly`/`daily`
- Si l'utilisateur donne un nom de ville, passer par `geocoding` d'abord -- `weather_forecast` n'accepte que des coordonnees
- L'heure dans `current_weather.time` est au format ISO local (grace au `timezone`) -- l'afficher en format court (HH:MM)
- Pour plusieurs villes, creer un `stat-card` par ville ou un seul avec des sections -- ne pas melanger les donnees dans un seul tableau
