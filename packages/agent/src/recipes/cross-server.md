---
id: cross-server
name: Croisement multi-serveurs
components_used: [map, gallery, table, kv]
when: la question de l'utilisateur necessite des donnees de plusieurs serveurs MCP
servers: []
layout:
  type: grid
  columns: 2
---

## Quand utiliser
L'utilisateur pose une question qui necessite de combiner des donnees provenant de plusieurs serveurs MCP connectes. Par exemple : "montre les oiseaux observes pres de la Tour Eiffel" (geocoding + iNaturalist).

## Comment
1. Identifier quels serveurs MCP fournissent quelles donnees
2. Appeler le premier serveur pour obtenir les donnees de base (ex: coordonnees GPS)
3. Utiliser ces donnees comme input pour le deuxieme serveur (ex: recherche par coordonnees)
4. Combiner les resultats dans une visualisation coherente
5. Utiliser `component("map", ...)` si des coordonnees sont impliquees
6. Utiliser `component("table", ...)` pour les resultats combines

## Exemple

Question : "Quels oiseaux peut-on observer pres du Louvre ?"
1. Geocoding → `geocode("Louvre, Paris")` → lat: 48.8606, lon: 2.3376
2. iNaturalist → `search_observations({lat: 48.8606, lon: 2.3376, taxon: "Aves"})` → liste d'especes
3. → `component("map", {center: [48.8606, 2.3376], markers: observations})`
4. → `component("gallery", {images: photos_des_oiseaux})`
5. → `component("table", {columns: ["Espece", "Date", "Observateur"], rows: ...})`

## Regles
- Toujours expliquer a l'utilisateur quels serveurs sont utilises et pourquoi
- Enchainer les appels DATA → render, meme entre serveurs
- Ne pas faire plus de 3 appels DATA sans render intermediaire
