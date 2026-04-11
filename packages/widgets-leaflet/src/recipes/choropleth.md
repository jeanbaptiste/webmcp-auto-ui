---
widget: choropleth
description: Carte choroplethe — regions GeoJSON colorees par valeur numerique avec legende.
group: leaflet
schema:
  type: object
  required:
    - geojson
    - values
  properties:
    title:
      type: string
      description: Titre optionnel
    geojson:
      type: object
      description: GeoJSON FeatureCollection
    values:
      type: object
      description: "Mapping feature name/id -> valeur numerique (ex: {\"Ile-de-France\": 12.5})"
    valueKey:
      type: string
      description: Propriete GeoJSON utilisee comme cle dans values (defaut "name")
    colorScale:
      type: string
      description: "Echelle de couleur: blues, reds, greens, oranges, purples, viridis (defaut blues)"
    height:
      type: string
      description: Hauteur CSS (defaut 400px)
---

## Quand utiliser

Pour visualiser des donnees par region (departements, pays, zones) avec un gradient de couleur. Ideal pour taux, densites, scores par zone geographique.

## Comment

Appeler `widget_display('choropleth', { geojson: featureCollection, values: {"Ile-de-France": 12.5, "Bretagne": 8.2}, colorScale: "blues" })`.

La propriete `valueKey` determine quel champ des features GeoJSON sert de cle dans `values` (par defaut `name`). Une legende avec gradient et min/max est generee automatiquement.

## Erreurs courantes

- Fournir un GeoJSON sans FeatureCollection (il faut `type: "FeatureCollection"`)
- Cles dans `values` qui ne correspondent pas aux proprietes GeoJSON
- Oublier de specifier `valueKey` quand la propriete n'est pas "name"
