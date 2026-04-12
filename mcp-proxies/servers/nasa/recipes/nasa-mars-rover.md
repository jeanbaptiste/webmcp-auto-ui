---
name: nasa-mars-rover
description: Affiche les photos des rovers martiens avec galerie et stats par camera
data_type: images
tools_used:
  - nasa_mars_rover
---

## Quand utiliser

L'utilisateur demande des photos de Mars, des images d'un rover (Curiosity, Perseverance, Opportunity, Spirit), ou veut explorer les photos par camera ou par sol.

## Pipeline

1. Appeler `nasa_mars_rover({rover: "curiosity", sol: N})` avec un sol recent. Si aucune photo n'est retournee, decrementer le sol et reessayer (le rover ne prend pas de photos tous les sols).
2. Le resultat contient un tableau de `{id, img_src, earth_date, sol, camera: {name, full_name}, rover: {name}}`. Le champ `img_src` est une URL JPEG directe.
3. Pour la galerie : transformer chaque photo en `{src: img_src, alt: camera.full_name, caption: camera.full_name + " -- " + earth_date + ", Sol " + sol}`.
4. Pour les stat cards : grouper les photos par `camera.name`, compter, et creer une card par camera.
5. Afficher la galerie avec `autoui_webmcp_widget_display({name: "gallery", params: {...}})` et les stats avec `autoui_webmcp_widget_display({name: "stat-card", params: {...}})`.

## Exemple complet

### Requete utilisateur
> "Montre-moi les dernieres photos de Curiosity sur Mars avec les stats par camera"

### Appel outil
```json
{"tool": "nasa_mars_rover", "arguments": {"rover": "curiosity", "sol": 4100}}
```

### Resultat (extrait)
```json
[
  {
    "id": 1234567,
    "img_src": "https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/04100/opgs/edr/fcam/FRA_1234_0700.JPG",
    "earth_date": "2026-04-10",
    "sol": 4100,
    "camera": {"name": "FHAZ", "full_name": "Front Hazard Avoidance Camera"},
    "rover": {"name": "Curiosity"}
  },
  {
    "id": 1234568,
    "img_src": "https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/04100/opgs/edr/ncam/NRA_5678_0700.JPG",
    "earth_date": "2026-04-10",
    "sol": 4100,
    "camera": {"name": "NAVCAM", "full_name": "Navigation Camera"},
    "rover": {"name": "Curiosity"}
  },
  {
    "id": 1234569,
    "img_src": "https://mars.nasa.gov/msl-raw-images/msss/04100/mcam/4100ML0234560.jpg",
    "earth_date": "2026-04-10",
    "sol": 4100,
    "camera": {"name": "MAST", "full_name": "Mast Camera"},
    "rover": {"name": "Curiosity"}
  }
]
```

### Affichage -- Galerie
```json
autoui_webmcp_widget_display({
  name: "gallery",
  params: {
    title: "Curiosity -- Sol 4100 (2026-04-10)",
    columns: 3,
    images: [
      {
        src: "https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/04100/opgs/edr/fcam/FRA_1234_0700.JPG",
        alt: "Front Hazard Avoidance Camera",
        caption: "Front Hazard Avoidance Camera -- 2026-04-10, Sol 4100"
      },
      {
        src: "https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/04100/opgs/edr/ncam/NRA_5678_0700.JPG",
        alt: "Navigation Camera",
        caption: "Navigation Camera -- 2026-04-10, Sol 4100"
      },
      {
        src: "https://mars.nasa.gov/msl-raw-images/msss/04100/mcam/4100ML0234560.jpg",
        alt: "Mast Camera",
        caption: "Mast Camera -- 2026-04-10, Sol 4100"
      }
    ]
  }
})
```

### Affichage -- Stat Cards (cameras)
```json
autoui_webmcp_widget_display({
  name: "stat-card",
  params: {
    cards: [
      {label: "FHAZ", value: 24, description: "Front Hazard Avoidance Camera"},
      {label: "NAVCAM", value: 18, description: "Navigation Camera"},
      {label: "MAST", value: 42, description: "Mast Camera"}
    ]
  }
})
```

## Erreurs courantes

- Ne JAMAIS inventer d'URLs d'images -- utiliser uniquement `img_src` retourne par l'API
- Si un sol ne retourne rien (tableau vide), decrementer le sol et reessayer -- le rover ne photographie pas tous les jours
- Les rovers disponibles sont : `curiosity`, `perseverance`, `opportunity`, `spirit` -- les deux derniers sont inactifs (missions terminees)
- Le champ `sol` est le jour martien (1 sol = 24h 37min terrestres), pas une date terrestre
- Ne pas confondre `camera.name` (code court : FHAZ, NAVCAM, MAST) et `camera.full_name` (nom complet) -- utiliser `full_name` pour l'affichage
