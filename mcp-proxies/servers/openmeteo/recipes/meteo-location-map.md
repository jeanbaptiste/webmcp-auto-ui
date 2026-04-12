---
name: meteo-location-map
description: Affiche une carte avec marqueurs meteo pour plusieurs villes
data_type: geo
tools_used:
  - geocoding
  - weather_forecast
---

## Quand utiliser

L'utilisateur demande une carte meteorologique de plusieurs villes, une comparaison geographique de la meteo, ou veut voir les temperatures/conditions sur une carte interactive.

## Pipeline

1. Pour chaque ville, appeler `geocoding({name: "NomVille", count: 1})` pour obtenir `{latitude, longitude, name, country, timezone}`.
2. Pour chaque ville geocodee, appeler `weather_forecast({latitude, longitude, current_weather: true, timezone})` pour obtenir les conditions actuelles.
3. Le resultat contient `{current_weather: {temperature, windspeed, winddirection, weathercode, time}}`.
4. Decoder le `weathercode` en description lisible (0 = ciel degage, 1-3 = partiellement nuageux, 45-48 = brouillard, 51-67 = pluie, 71-77 = neige, 80-82 = averses, 95-99 = orage).
5. Construire un marqueur par ville avec : `{lat, lng, label, popup}` ou popup contient temperature + condition.
6. Afficher avec `autoui_webmcp_widget_display({name: "map", params: {markers: [...]}})`.

## Exemple complet

### Requete utilisateur
> "Montre-moi la meteo de Paris, Lyon et Marseille sur une carte"

### Appels geocoding (3 appels)
```json
{"tool": "geocoding", "arguments": {"name": "Paris", "count": 1}}
{"tool": "geocoding", "arguments": {"name": "Lyon", "count": 1}}
{"tool": "geocoding", "arguments": {"name": "Marseille", "count": 1}}
```

### Resultats geocoding (extrait)
```json
[
  {"latitude": 48.8566, "longitude": 2.3522, "name": "Paris", "timezone": "Europe/Paris"},
  {"latitude": 45.7640, "longitude": 4.8357, "name": "Lyon", "timezone": "Europe/Paris"},
  {"latitude": 43.2965, "longitude": 5.3698, "name": "Marseille", "timezone": "Europe/Paris"}
]
```

### Appels weather_forecast (3 appels)
```json
{
  "tool": "weather_forecast",
  "arguments": {"latitude": 48.8566, "longitude": 2.3522, "current_weather": true, "timezone": "Europe/Paris"}
}
```
Repeter pour Lyon (45.7640, 4.8357) et Marseille (43.2965, 5.3698).

### Resultats weather_forecast (extrait)
```json
[
  {"current_weather": {"temperature": 16.5, "windspeed": 12.3, "weathercode": 2, "time": "2026-04-12T14:00"}},
  {"current_weather": {"temperature": 18.1, "windspeed": 8.7, "weathercode": 0, "time": "2026-04-12T14:00"}},
  {"current_weather": {"temperature": 21.3, "windspeed": 15.2, "weathercode": 1, "time": "2026-04-12T14:00"}}
]
```

### Affichage
```json
autoui_webmcp_widget_display({
  name: "map",
  params: {
    title: "Meteo actuelle - France",
    center: {lat: 46.5, lng: 3.5},
    zoom: 6,
    markers: [
      {
        lat: 48.8566,
        lng: 2.3522,
        label: "Paris",
        popup: "Paris : 16.5C - Partiellement nuageux, vent 12.3 km/h"
      },
      {
        lat: 45.7640,
        lng: 4.8357,
        label: "Lyon",
        popup: "Lyon : 18.1C - Ciel degage, vent 8.7 km/h"
      },
      {
        lat: 43.2965,
        lng: 5.3698,
        label: "Marseille",
        popup: "Marseille : 21.3C - Principalement degage, vent 15.2 km/h"
      }
    ]
  }
})
```

## Erreurs courantes

- Ne JAMAIS hardcoder les coordonnees -- toujours passer par `geocoding` pour chaque ville
- Toujours decoder le `weathercode` en texte lisible dans les popups -- le code brut n'est pas parlant pour l'utilisateur
- Centrer la carte automatiquement sur le barycentre des marqueurs, pas sur une position fixe
- Ne pas oublier le `timezone` dans chaque appel `weather_forecast` -- sinon les heures affichees seront en UTC
- Pour plus de 5-6 villes, adapter le zoom pour que tous les marqueurs soient visibles
- Les coordonnees `geocoding` retournent parfois plusieurs resultats homonymes -- toujours prendre `count: 1` et verifier le `country` si ambigu
