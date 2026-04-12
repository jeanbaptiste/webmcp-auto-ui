---
name: inat-observations-map
description: Affiche une carte des observations iNaturalist avec marqueurs geolocalises par espece
data_type: geo
tools_used:
  - search_observations
---

## Quand utiliser

L'utilisateur veut visualiser la repartition geographique d'observations naturalistes, voir ou des especes ont ete observees sur une carte, ou explorer la biodiversite d'une zone. Exemples : "ou sont les observations de renards a Marseille ?", "carte des orchidees en Ile-de-France", "montre-moi la repartition des observations autour de ce point".

## Pipeline

1. Appeler `search_observations({taxon_name: "...", lat: ..., lng: ..., radius: ..., quality_grade: "research", per_page: N})` avec le taxon et/ou la localisation demandes.
2. Le resultat contient un tableau d'observations, chacune avec `{id, location: "lat,lng", taxon: {name, preferred_common_name}, observed_on, place_guess}`. Le champ `location` est une chaine `"latitude,longitude"`.
3. Pour chaque observation, parser `location` en extrayant latitude et longitude (split sur la virgule). Filtrer les observations sans `location`.
4. Construire un tableau de marqueurs avec `lat`, `lng`, `label` (nom commun ou scientifique), et optionnellement `popup` (details : espece, date, lieu).
5. Afficher avec `autoui_webmcp_widget_display({name: "map", params: {title: "...", center: [lat, lng], zoom: N, markers: [...]}})`

## Exemple complet

### Requete utilisateur
> "Montre-moi sur une carte les observations de renards pres de Marseille"

### Appel outil
```json
{"tool": "search_observations", "arguments": {"taxon_name": "Vulpes vulpes", "lat": 43.2965, "lng": 5.3698, "radius": 30, "quality_grade": "research", "per_page": 10}}
```

### Resultat (extrait)
```json
[
  {
    "id": 201456789,
    "location": "43.3120,5.4210",
    "taxon": {
      "name": "Vulpes vulpes",
      "preferred_common_name": "Red Fox"
    },
    "observed_on": "2026-03-28",
    "place_guess": "Parc national des Calanques, Marseille, France"
  },
  {
    "id": 201456800,
    "location": "43.2890,5.3950",
    "taxon": {
      "name": "Vulpes vulpes",
      "preferred_common_name": "Red Fox"
    },
    "observed_on": "2026-04-02",
    "place_guess": "Colline de Notre-Dame de la Garde, Marseille, France"
  }
]
```

### Affichage
```json
autoui_webmcp_widget_display({
  name: "map",
  params: {
    title: "Observations de renards pres de Marseille",
    center: [43.2965, 5.3698],
    zoom: 11,
    markers: [
      {
        lat: 43.3120,
        lng: 5.4210,
        label: "Red Fox (Vulpes vulpes)",
        popup: "Renard roux -- 2026-03-28 -- Parc national des Calanques, Marseille"
      },
      {
        lat: 43.2890,
        lng: 5.3950,
        label: "Red Fox (Vulpes vulpes)",
        popup: "Renard roux -- 2026-04-02 -- Colline de Notre-Dame de la Garde, Marseille"
      }
    ]
  }
})
```

## Erreurs courantes

- Ne JAMAIS inventer de coordonnees -- utiliser uniquement le champ `location` retourne par `search_observations`
- Le champ `location` est une chaine `"lat,lng"` (pas un tableau) -- bien parser en splittant sur la virgule
- Certaines observations n'ont pas de `location` (observations sans geolocalisation) -- les filtrer avant l'affichage sur la carte
- Centrer la carte sur les coordonnees de recherche (`lat`, `lng` passes en parametres), pas sur le premier marqueur
- Adapter le `zoom` au `radius` de recherche : radius 5km -> zoom 13, radius 30km -> zoom 11, radius 100km -> zoom 9
- Pour des recherches multi-especes, colorer les marqueurs par espece pour faciliter la lecture de la carte
- Utiliser `quality_grade: "research"` pour des localisations fiables
