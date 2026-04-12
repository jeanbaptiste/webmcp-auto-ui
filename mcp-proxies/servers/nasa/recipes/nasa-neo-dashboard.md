---
name: nasa-neo-dashboard
description: Dashboard des asteroides proches de la Terre avec KPI, tableau de donnees et graphique
data_type: kpi
tools_used:
  - nasa_neo
---

## Quand utiliser

L'utilisateur demande des informations sur les asteroides, les objets proches de la Terre (NEO), les risques d'impact, ou veut un tableau de bord des menaces asteroidales.

## Pipeline

1. Appeler `nasa_neo({start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD"})` -- la plage ne doit pas depasser 7 jours.
2. Le resultat contient un tableau de NEO avec `{name, estimated_diameter: {kilometers: {min, max}}, is_potentially_hazardous_asteroid, close_approach_data: [{close_approach_date, relative_velocity: {kilometers_per_hour}, miss_distance: {kilometers}}]}`.
3. Pour les stat cards : calculer le nombre total de NEO, le nombre de potentiellement dangereux, le plus gros diametre estime, et la distance minimale d'approche.
4. Pour le data-table : une ligne par NEO avec nom, diametre, vitesse, distance, et indicateur de danger.
5. Pour le chart : un bar chart des distances d'approche (ou des diametres) pour visualiser la repartition.
6. Afficher les 3 widgets dans l'ordre : stat-card, data-table, chart.

## Exemple complet

### Requete utilisateur
> "Quels asteroides passent pres de la Terre cette semaine ? Montre-moi un dashboard complet."

### Appel outil
```json
{"tool": "nasa_neo", "arguments": {"start_date": "2026-04-06", "end_date": "2026-04-12"}}
```

### Resultat (extrait)
```json
[
  {
    "name": "2026 AB1",
    "estimated_diameter": {
      "kilometers": {"min": 0.12, "max": 0.27}
    },
    "is_potentially_hazardous_asteroid": true,
    "close_approach_data": [{
      "close_approach_date": "2026-04-08",
      "relative_velocity": {"kilometers_per_hour": "54320.8"},
      "miss_distance": {"kilometers": "1842567.3"}
    }]
  },
  {
    "name": "2024 QR3",
    "estimated_diameter": {
      "kilometers": {"min": 0.04, "max": 0.09}
    },
    "is_potentially_hazardous_asteroid": false,
    "close_approach_data": [{
      "close_approach_date": "2026-04-10",
      "relative_velocity": {"kilometers_per_hour": "23456.1"},
      "miss_distance": {"kilometers": "7654321.0"}
    }]
  }
]
```

### Affichage -- Stat Cards (KPI)
```json
autoui_webmcp_widget_display({
  name: "stat-card",
  params: {
    cards: [
      {label: "Total NEOs", value: 14, description: "Asteroides detectes cette semaine"},
      {label: "Potentiellement dangereux", value: 3, description: "Flagges par la NASA"},
      {label: "Plus gros diametre", value: "270 m", description: "2026 AB1 (max estime)"},
      {label: "Approche la plus proche", value: "1.84M km", description: "2026 AB1 le 2026-04-08"}
    ]
  }
})
```

### Affichage -- Data Table
```json
autoui_webmcp_widget_display({
  name: "data-table",
  params: {
    title: "Near-Earth Objects -- 6-12 avril 2026",
    columns: [
      {key: "name", label: "Nom"},
      {key: "diameter", label: "Diametre (km)"},
      {key: "velocity", label: "Vitesse (km/h)"},
      {key: "distance", label: "Distance (km)"},
      {key: "hazardous", label: "Dangereux"}
    ],
    rows: [
      {name: "2026 AB1", diameter: "0.12 - 0.27", velocity: "54 321", distance: "1 842 567", hazardous: "Oui"},
      {name: "2024 QR3", diameter: "0.04 - 0.09", velocity: "23 456", distance: "7 654 321", hazardous: "Non"}
    ]
  }
})
```

### Affichage -- Chart (distances d'approche)
```json
autoui_webmcp_widget_display({
  name: "chart",
  params: {
    title: "Distance d'approche des NEO (km)",
    type: "bar",
    data: {
      labels: ["2026 AB1", "2024 QR3"],
      datasets: [{
        label: "Distance (millions km)",
        data: [1.84, 7.65]
      }]
    },
    options: {
      horizontal: true
    }
  }
})
```

## Erreurs courantes

- Ne JAMAIS depasser 7 jours entre `start_date` et `end_date` -- l'API rejette les plages plus larges
- Les champs `relative_velocity.kilometers_per_hour` et `miss_distance.kilometers` sont des **strings**, pas des nombres -- les convertir en nombres avant de les afficher ou de les utiliser dans un chart
- `estimated_diameter` contient `min` et `max` -- afficher la fourchette, pas une seule valeur
- `is_potentially_hazardous_asteroid` est un booleen -- ne pas le confondre avec un risque d'impact imminent, c'est une classification orbitale
- `close_approach_data` est un tableau -- un NEO peut avoir plusieurs approches dans la plage, prendre la plus proche
- Formater les grands nombres avec des separateurs de milliers pour la lisibilite
