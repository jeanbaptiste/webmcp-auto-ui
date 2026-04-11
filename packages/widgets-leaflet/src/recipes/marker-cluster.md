---
widget: marker-cluster
description: Carte Leaflet avec clustering de markers — regroupement automatique des marqueurs proches par grille.
group: leaflet
schema:
  type: object
  required:
    - markers
  properties:
    title:
      type: string
      description: Titre optionnel
    markers:
      type: array
      description: Marqueurs a regrouper
      items:
        type: object
        required:
          - lat
          - lng
        properties:
          lat:
            type: number
          lng:
            type: number
          label:
            type: string
            description: Texte du tooltip/popup
    gridSize:
      type: number
      description: Taille de la grille de clustering en pixels (defaut 60)
    height:
      type: string
      description: Hauteur CSS (defaut 400px)
---

## Quand utiliser

Pour afficher un grand nombre de marqueurs (>50) qui se chevauchent. Le clustering par grille regroupe les marqueurs proches en cercles avec compteur. Le dezoom regroupe, le zoom eclate les clusters.

## Comment

Appeler `widget_display('marker-cluster', { markers: [{ lat: 48.85, lng: 2.35, label: "A" }, { lat: 48.851, lng: 2.351, label: "B" }, ...] })`.

Les clusters sont recalcules a chaque changement de zoom. Cliquer sur un cluster zoome pour eclater le groupe.

## Erreurs courantes

- `gridSize` trop petit (<20) cree trop de clusters, trop grand (>200) regroupe tout
- Ne pas fournir de `label` rend les markers individuels muets (pas de popup)
- Utiliser ce widget pour <10 markers — preferer `leaflet-map` directement
