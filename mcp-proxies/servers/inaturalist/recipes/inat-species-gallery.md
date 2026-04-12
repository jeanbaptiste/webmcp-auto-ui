---
name: inat-species-gallery
description: Affiche une galerie d'especes observees sur iNaturalist avec photos, noms et metadonnees
data_type: images
tools_used:
  - search_observations
---

## Quand utiliser

L'utilisateur demande des photos d'especes, de faune ou de flore, des observations naturalistes, ou veut voir les especes presentes dans une zone geographique donnee. Exemples : "montre-moi les oiseaux observes pres de Lyon", "photos de papillons en Bretagne", "quelles especes ont ete vues dans ce parc".

## Pipeline

1. Appeler `search_observations({taxon_name: "...", lat: ..., lng: ..., radius: ..., quality_grade: "research", per_page: N})` avec le taxon et/ou la localisation demandes. Le champ `taxon_name` accepte des noms scientifiques (ex: "Accipitriformes") ou vernaculaires (ex: "butterfly").
2. Le resultat contient un tableau d'observations, chacune avec `{id, species_guess, taxon: {name, preferred_common_name}, photos: [{url}], observed_on, place_guess, quality_grade}`.
3. Pour chaque observation, extraire `photos[0].url` et **remplacer `square` par `medium`** dans l'URL pour obtenir une image de meilleure resolution. Ne jamais inventer d'URL -- utiliser uniquement celles retournees par l'API.
4. Transformer chaque observation en item de galerie : `src` = URL photo corrigee, `alt` = nom commun + nom scientifique, `caption` = `species_guess` + `observed_on` + `place_guess`.
5. Afficher avec `autoui_webmcp_widget_display({name: "gallery", params: {title: "...", columns: 3, images: [...]}})`

## Exemple complet

### Requete utilisateur
> "Montre-moi les rapaces observes pres de Paris"

### Appel outil
```json
{"tool": "search_observations", "arguments": {"taxon_name": "Accipitriformes", "lat": 48.8566, "lng": 2.3522, "radius": 50, "quality_grade": "research", "per_page": 6}}
```

### Resultat (extrait)
```json
[
  {
    "id": 198234567,
    "species_guess": "Buse variable",
    "taxon": {
      "name": "Buteo buteo",
      "preferred_common_name": "Common Buzzard"
    },
    "photos": [
      {"url": "https://inaturalist-open-data.s3.amazonaws.com/photos/312345678/square.jpeg"}
    ],
    "observed_on": "2026-04-08",
    "place_guess": "Foret de Fontainebleau, France",
    "quality_grade": "research"
  },
  {
    "id": 198234890,
    "species_guess": "Epervier d'Europe",
    "taxon": {
      "name": "Accipiter nisus",
      "preferred_common_name": "Eurasian Sparrowhawk"
    },
    "photos": [
      {"url": "https://inaturalist-open-data.s3.amazonaws.com/photos/312345999/square.jpeg"}
    ],
    "observed_on": "2026-04-06",
    "place_guess": "Parc de Sceaux, Hauts-de-Seine, France",
    "quality_grade": "research"
  }
]
```

### Affichage
```json
autoui_webmcp_widget_display({
  name: "gallery",
  params: {
    title: "Rapaces observes pres de Paris",
    columns: 3,
    images: [
      {
        src: "https://inaturalist-open-data.s3.amazonaws.com/photos/312345678/medium.jpeg",
        alt: "Common Buzzard (Buteo buteo)",
        caption: "Buse variable -- 2026-04-08 -- Foret de Fontainebleau, France"
      },
      {
        src: "https://inaturalist-open-data.s3.amazonaws.com/photos/312345999/medium.jpeg",
        alt: "Eurasian Sparrowhawk (Accipiter nisus)",
        caption: "Epervier d'Europe -- 2026-04-06 -- Parc de Sceaux, Hauts-de-Seine, France"
      }
    ]
  }
})
```

## Erreurs courantes

- Ne JAMAIS inventer d'URLs d'images -- utiliser uniquement les URLs retournees par `search_observations` dans le champ `photos[].url`
- TOUJOURS remplacer `square` par `medium` (ou `large`) dans l'URL photo -- les vignettes `square` sont trop petites (75x75px) pour une galerie
- Ne pas oublier `photos[0]` -- certaines observations ont plusieurs photos, prendre au moins la premiere
- Certaines observations n'ont pas de photos (`photos: []`) -- les filtrer avant l'affichage
- Utiliser `quality_grade: "research"` pour des identifications fiables (validees par la communaute)
- Ne pas depasser `per_page: 30` -- l'API iNaturalist peut etre lente sur de gros volumes
