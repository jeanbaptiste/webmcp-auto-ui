---
id: cartographier-observations-biodiversite
name: Cartographier les observations de biodiversite sur une zone geographique
components_used: [map, gallery, table, stat-card]
when: l'utilisateur demande une carte des observations naturalistes, la biodiversite d'une zone, les especes presentes dans un lieu, ou les observations iNaturalist d'une region
servers: [inaturalist]
layout:
  type: grid
  columns: 2
  arrangement: carte pleine largeur en haut, galerie + stats en dessous
---

## Quand utiliser

L'utilisateur pose une question sur la biodiversite d'un lieu ou demande une carte des observations :
- "Quelles especes d'oiseaux observe-t-on a Paris ?"
- "Montre-moi une carte des observations de papillons dans les Alpes"
- "Quelle est la biodiversite autour du lac d'Annecy ?"
- "Les especes menacees observees en Ile-de-France"

Le serveur iNaturalist fournit des observations georeferencees avec photos, taxons, dates et observateurs.

## Comment

1. **Rechercher les observations** dans la zone cible :
   ```
   search_observations({lat: 48.85, lng: 2.35, radius: 10, taxon_name: "Aves", per_page: 50})
   ```
   Parametres utiles :
   - `lat`, `lng`, `radius` : centre et rayon de la zone en km
   - `taxon_name` : filtre taxonomique ("Aves", "Lepidoptera", "Mammalia", etc.)
   - `quality_grade` : "research" pour les observations verifiees
   - `per_page` : nombre de resultats (max 200)

2. **Afficher la carte** avec les marqueurs d'observation :
   ```
   component("map", {
     center: [48.85, 2.35],
     zoom: 12,
     markers: observations.map(o => ({
       lat: o.latitude,
       lon: o.longitude,
       label: o.species_guess,
       popup: o.species_guess + " — " + o.observed_on
     }))
   })
   ```

3. **Statistiques de la zone** en stat-cards :
   ```
   component("stat-card", {label: "Observations", value: total_results, icon: "eye"})
   component("stat-card", {label: "Especes uniques", value: uniqueSpecies.length, icon: "leaf"})
   component("stat-card", {label: "Observateurs", value: uniqueObservers.length, icon: "users"})
   component("stat-card", {label: "Grade recherche", value: researchGradeCount, icon: "check-circle"})
   ```

4. **Galerie des especes avec photos** :
   ```
   component("gallery", {
     images: observations
       .filter(o => o.photos?.length > 0)
       .map(o => ({
         src: o.photos[0].url.replace("square", "medium"),
         alt: o.species_guess,
         caption: o.place_guess + " — " + o.observed_on
       }))
   })
   ```

5. **Tableau recapitulatif** des especes :
   ```
   component("table", {
     columns: ["Espece", "Nom scientifique", "Observations", "Derniere obs."],
     rows: speciesSummary
   })
   ```

## Exemples

### Oiseaux de Paris
```
// 1. Recherche
search_observations({lat: 48.8566, lng: 2.3522, radius: 10, taxon_name: "Aves", quality_grade: "research", per_page: 100})

// 2. Rendu
component("map", {center: [48.8566, 2.3522], zoom: 12, markers: birdMarkers})
component("stat-card", {label: "Especes d'oiseaux", value: "47", icon: "bird"})
component("stat-card", {label: "Observations verifiees", value: "312", icon: "check"})
component("gallery", {images: birdPhotos})
component("table", {columns: ["Espece", "Observations", "Derniere"], rows: birdSummary})
```

### Papillons des Alpes
```
// 1. Zone large autour de Chamonix
search_observations({lat: 45.9237, lng: 6.8694, radius: 30, taxon_name: "Lepidoptera", per_page: 100})

// 2. Rendu avec clustering sur la carte
component("map", {center: [45.9237, 6.8694], zoom: 10, markers: butterflyMarkers, cluster: true})
component("stat-card", {label: "Especes de papillons", value: uniqueSpecies.length})
component("gallery", {images: butterflyPhotos})
component("table", {columns: ["Espece", "Altitude", "Mois", "Observateur"], rows: enrichedData})
```

## Erreurs courantes

- **Rayon trop large** : un rayon de 100 km retourne trop de resultats et noie l'information — preferer 5-20 km et augmenter si peu de resultats
- **Thumbnails iNaturalist** : les URLs par defaut sont en format "square" (75x75) — remplacer "square" par "medium" (200px) ou "large" (500px)
- **Pas de filtre taxonomique** : sans filtre, iNaturalist retourne plantes + animaux + champignons ensemble — toujours filtrer par groupe si l'utilisateur en mentionne un
- **Oublier le grade de qualite** : les observations "casual" peuvent etre mal identifiees — preferer `quality_grade: "research"` pour des donnees fiables
- **Carte sans zoom adapte** : ajuster le zoom en fonction du rayon de recherche (5 km → zoom 13, 20 km → zoom 11, 50 km → zoom 9)
