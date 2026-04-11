---
widget: leaflet-map
description: Carte interactive Leaflet avec markers, popups et zoom. Fond OpenStreetMap.
group: leaflet
schema:
  type: object
  properties:
    title:
      type: string
      description: Titre optionnel au-dessus de la carte
    center:
      type: array
      description: Centre de la carte [lat, lng]
      items:
        type: number
      minItems: 2
      maxItems: 2
    zoom:
      type: number
      description: Niveau de zoom (1-18, defaut 13)
    markers:
      type: array
      description: Marqueurs a placer sur la carte
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
            description: Texte du tooltip
          popup:
            type: string
            description: Contenu HTML du popup
    height:
      type: string
      description: Hauteur CSS de la carte (defaut 400px)
---

## Quand utiliser

Pour afficher une carte interactive avec des marqueurs et popups. Ideal pour des points d'interet, adresses, localisations.

## Comment

Appeler `widget_display('leaflet-map', { center: [48.8566, 2.3522], zoom: 13, markers: [{ lat: 48.8566, lng: 2.3522, label: "Paris", popup: "<b>Paris</b><br>Capitale" }] })`.

Si `center` n'est pas fourni, la carte se centre automatiquement sur les markers.

## Erreurs courantes

- Inverser lat et lng (latitude = Nord/Sud ~48, longitude = Est/Ouest ~2)
- Oublier de fournir `center` quand il n'y a pas de markers
- Zoom trop eleve (>18) ou trop faible (<1)
