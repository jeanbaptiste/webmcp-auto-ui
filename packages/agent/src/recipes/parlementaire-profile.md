---
id: parlementaire-profile
name: Profil parlementaire
components_used: [profile, hemicycle, timeline, table, stat-card]
when: donnees sur un depute, senateur, ou groupe parlementaire
servers: [tricoteuses, nosdeputes, nossenateurs]
layout:
  type: grid
  columns: 2
  arrangement: profile + stats en haut, hemicycle + timeline en bas
---

## Quand utiliser
Les donnees MCP concernent un parlementaire (depute ou senateur), un groupe politique, ou des votes parlementaires. Typique avec les serveurs Tricoteuses/NosDéputes.

## Comment
1. Recuperer les informations du parlementaire via l'outil DATA
2. Afficher le profil avec `component("profile", {name, photo, subtitle, details})`
3. Afficher les statistiques de vote avec `component("stat-card", ...)` (participation, loyaute)
4. Si des donnees de vote par groupe sont disponibles, utiliser `component("hemicycle", ...)`
5. Pour l'historique des mandats ou votes, utiliser `component("timeline", ...)`
6. Pour les details des votes, utiliser `component("table", ...)`

## Exemple

Recherche d'un depute :
1. `search_amendments({député: "Dupont"})` → infos du depute
2. → `component("profile", {name: "Jean Dupont", subtitle: "Depute du Rhone", photo: url_photo})`
3. → `component("stat-card", {label: "Participation", value: "87%"})`
4. → `component("stat-card", {label: "Amendements deposes", value: "42"})`
5. `get_votes({député_id: id})` → historique des votes
6. → `component("hemicycle", {groups: [...], votes: [...]})`
7. → `component("timeline", {events: mandats_et_votes_cles})`

## Composants specifiques
- **hemicycle** : arc de cercle montrant la repartition des votes par groupe politique
- **trombinoscope** : grille de photos pour un groupe de parlementaires
- **profile** : fiche individuelle avec photo, nom, fonction, details
- **timeline** : chronologie des evenements (mandats, votes cles)
