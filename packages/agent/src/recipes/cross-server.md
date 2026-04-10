---
id: croiser-donnees-de-plusieurs-serveurs-mcp-connectes
name: Croiser les donnees de plusieurs serveurs MCP connectes simultanement
components_used: [map, gallery, table, kv, stat-card]
when: la question de l'utilisateur necessite de combiner des donnees provenant de plusieurs serveurs MCP connectes, par exemple croiser geolocalisation et observations, ou enrichir des donnees parlementaires avec Wikipedia
servers: []
layout:
  type: grid
  columns: 2
---

## Quand utiliser

L'utilisateur pose une question qui ne peut etre satisfaite par un seul serveur MCP. Exemples :
- "Quels oiseaux peut-on observer pres du Louvre ?" → geocoding + iNaturalist
- "Montre-moi la meteo et les observations naturalistes a Marseille" → Open-Meteo + iNaturalist
- "Compare les oeuvres du Met Museum sur le theme des fleurs avec les especes observees a New York" → Met Museum + iNaturalist
- "Donne-moi le profil Wikipedia du depute qui a depose le plus d'amendements" → Tricoteuses + Wikipedia

La recette s'applique des que 2+ serveurs MCP sont necessaires pour repondre.

## Comment

1. **Identifier quels serveurs MCP fournissent quelles donnees** :
   - Serveur A fournit les donnees de reference (coordonnees, IDs, noms)
   - Serveur B enrichit avec des donnees complementaires
2. **Appeler le premier serveur** pour obtenir les donnees de base :
   ```
   // Exemple : geocoder un lieu
   geocode({query: "Louvre, Paris"}) → {lat: 48.8606, lon: 2.3376}
   ```
3. **Utiliser les resultats comme input** pour le deuxieme serveur :
   ```
   // Exemple : chercher les observations dans un rayon
   search_observations({lat: 48.8606, lng: 2.3376, radius: 5, taxon: "Aves"})
   ```
4. **Combiner les resultats** dans une visualisation coherente :
   - `component("map", ...)` si des coordonnees sont impliquees (marqueurs des deux sources)
   - `component("table", ...)` pour les resultats combines avec colonnes des deux sources
   - `component("gallery", ...)` si les deux sources fournissent des images
5. **Toujours citer les sources** avec un composant `kv` final :
   ```
   component("kv", {pairs: [["Source 1", "iNaturalist"], ["Source 2", "Open-Meteo"], ["Zone", "5 km autour du Louvre"]]})
   ```

## Exemples

### Oiseaux pres d'un monument (geocoding + iNaturalist)
```
// 1. Geocoder le lieu
geocode({query: "Tour Eiffel, Paris"}) → lat: 48.8584, lon: 2.2945

// 2. Chercher les observations d'oiseaux
search_observations({lat: 48.8584, lng: 2.2945, radius: 3, taxon_name: "Aves"})

// 3. Rendu combine
component("map", {
  center: [48.8584, 2.2945],
  zoom: 14,
  markers: [{lat: 48.8584, lon: 2.2945, label: "Tour Eiffel", icon: "landmark"}]
    .concat(observations.map(o => ({lat: o.lat, lon: o.lon, label: o.species_guess})))
})
component("gallery", {images: observations.flatMap(o => o.photos.map(p => ({src: p.url, alt: o.species_guess})))})
component("table", {columns: ["Espece", "Date", "Distance", "Observateur"], rows: formattedObs})
component("stat-card", {label: "Especes distinctes", value: "23", icon: "bird"})
```

### Profil enrichi (Tricoteuses + Wikipedia)
```
// 1. Chercher le depute le plus actif
query_sql({sql: "SELECT depute, COUNT(*) as nb FROM amendements GROUP BY depute ORDER BY nb DESC LIMIT 1"})

// 2. Enrichir avec Wikipedia
search_wikipedia({query: depute.nom})

// 3. Rendu combine
component("profile", {name: depute.nom, subtitle: depute.groupe, details: wikipedia.extract})
component("stat-card", {label: "Amendements deposes", value: depute.nb})
component("kv", {pairs: [["Source parlementaire", "Tricoteuses"], ["Biographie", "Wikipedia"]]})
```

### Meteo + Biodiversite dans une region
```
// 1. Meteo pour Marseille
get_forecast({latitude: 43.2965, longitude: 5.3698, daily: "temperature_2m_max"})

// 2. Observations naturalistes
search_observations({lat: 43.2965, lng: 5.3698, radius: 20})

// 3. Dashboard combine
component("stat-card", {label: "Temperature max", value: "26°C", icon: "thermometer"})
component("stat-card", {label: "Observations recentes", value: "412", icon: "eye"})
component("map", {center: [43.2965, 5.3698], markers: observations})
component("chart", {type: "line", labels: dates, datasets: [{label: "Temperature", data: temps}, {label: "Observations", data: obsCounts}]})
```

## Erreurs courantes

- **Faire plus de 3 appels DATA sans render intermediaire** : l'utilisateur attend des resultats visuels entre les etapes
- **Ne pas expliquer quels serveurs sont utilises** : toujours afficher les sources avec un `kv`
- **Melanger les donnees sans structure** : les resultats combines doivent etre dans un tableau ou une carte coherente, pas un dump brut
- **Oublier de gerer les cas sans correspondance** : si le geocoding ne trouve rien, ou si iNaturalist n'a pas d'observations dans la zone, l'afficher clairement
