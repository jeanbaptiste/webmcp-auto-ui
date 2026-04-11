---
widget: map
description: Carte interactive avec marqueurs
group: advanced
schema:
  type: object
  properties:
    title:
      type: string
    center:
      type: object
      properties:
        lat:
          type: number
        lng:
          type: number
    zoom:
      type: number
    height:
      type: string
    markers:
      type: array
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
          color:
            type: string
---

## Quand utiliser
Pour afficher des données géolocalisées — adresses, points d'intérêt, itinéraires, zones de couverture. Idéal quand l'utilisateur demande "où se trouve..." ou "montre sur une carte".

## Comment
1. Récupérer les coordonnées via MCP (lat/lng)
2. Définir le centre et le zoom selon l'étendue des données
3. Appeler `autoui_webmcp_widget_display('map', { title: 'Nos bureaux', center: { lat: 48.8566, lng: 2.3522 }, zoom: 12, markers: [{ lat: 48.8566, lng: 2.3522, label: 'Siège Paris' }] })`

## Erreurs courantes
- Inverser lat et lng (latitude = Nord/Sud, longitude = Est/Ouest)
- Oublier de centrer la carte sur les marqueurs affichés
