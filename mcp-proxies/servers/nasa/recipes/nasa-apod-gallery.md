---
name: nasa-apod-gallery
description: Affiche une galerie d'images astronomiques du jour (Astronomy Picture of the Day)
data_type: images
tools_used:
  - nasa_apod
---

## Quand utiliser

L'utilisateur demande des images astronomiques, des photos de l'espace, l'image du jour de la NASA, ou une collection d'images APOD sur une periode donnee.

## Pipeline

1. Appeler `nasa_apod({count: N})` pour N images aleatoires, ou `nasa_apod({start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD"})` pour une plage de dates. Sans parametre, retourne l'APOD du jour.
2. Le resultat contient un tableau d'objets `{hdurl, url, title, explanation, date, media_type, copyright}`. Le champ `hdurl` est l'URL haute resolution (JPEG/PNG). Le champ `media_type` peut etre `"image"` ou `"video"` -- filtrer les videos si on veut une galerie d'images.
3. Transformer chaque objet en item de galerie : `src` = `hdurl` (ou `url` si `hdurl` absent), `alt` = `title`, `caption` = troncature de `explanation` (2 phrases max) + `date`.
4. Afficher avec `autoui_webmcp_widget_display({name: "gallery", params: {title: "NASA - Astronomy Picture of the Day", columns: 3, images: [...]}})`

## Exemple complet

### Requete utilisateur
> "Montre-moi 6 images astronomiques de la NASA"

### Appel outil
```json
{"tool": "nasa_apod", "arguments": {"count": 6}}
```

### Resultat (extrait)
```json
[
  {
    "title": "Andromeda Galaxy",
    "hdurl": "https://apod.nasa.gov/apod/image/2604/M31_full.jpg",
    "url": "https://apod.nasa.gov/apod/image/2604/M31_small.jpg",
    "explanation": "The Andromeda Galaxy is the nearest large galaxy to our Milky Way. It spans over 200,000 light-years across.",
    "date": "2026-04-10",
    "media_type": "image",
    "copyright": "Robert Gendler"
  },
  {
    "title": "Pillars of Creation",
    "hdurl": "https://apod.nasa.gov/apod/image/2604/Pillars_full.jpg",
    "url": "https://apod.nasa.gov/apod/image/2604/Pillars_small.jpg",
    "explanation": "These towering tendrils of cosmic dust and gas sit at the heart of the Eagle Nebula.",
    "date": "2026-04-09",
    "media_type": "image"
  }
]
```

### Affichage
```json
autoui_webmcp_widget_display({
  name: "gallery",
  params: {
    title: "NASA - Astronomy Picture of the Day",
    columns: 3,
    images: [
      {
        src: "https://apod.nasa.gov/apod/image/2604/M31_full.jpg",
        alt: "Andromeda Galaxy",
        caption: "The Andromeda Galaxy is the nearest large galaxy to our Milky Way. (2026-04-10)"
      },
      {
        src: "https://apod.nasa.gov/apod/image/2604/Pillars_full.jpg",
        alt: "Pillars of Creation",
        caption: "These towering tendrils of cosmic dust and gas sit at the heart of the Eagle Nebula. (2026-04-09)"
      }
    ]
  }
})
```

## Erreurs courantes

- Ne JAMAIS inventer d'URLs d'images -- utiliser uniquement `hdurl` ou `url` retournes par l'API
- Utiliser `hdurl` pour la haute resolution, `url` pour la version standard (fallback si `hdurl` est absent)
- Filtrer les entrees ou `media_type` est `"video"` -- elles n'ont pas de `hdurl` image valide
- Ne pas depasser `count: 20` -- l'API peut etre lente sur de gros volumes
- Pour une plage de dates, `end_date` doit etre >= `start_date` et ne pas depasser la date du jour
