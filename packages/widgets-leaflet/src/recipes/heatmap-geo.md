---
widget: heatmap-geo
description: Heatmap geographique — points avec intensite rendus en overlay canvas sur carte Leaflet.
group: leaflet
schema:
  type: object
  required:
    - points
  properties:
    title:
      type: string
      description: Titre optionnel
    points:
      type: array
      description: Points avec intensite
      items:
        type: object
        required:
          - lat
          - lng
          - intensity
        properties:
          lat:
            type: number
          lng:
            type: number
          intensity:
            type: number
            description: Intensite du point (0-1, normalise automatiquement si hors plage)
    radius:
      type: number
      description: Rayon de chaque point en pixels (defaut 25)
    opacity:
      type: number
      description: Opacite maximale de la heatmap (0-1, defaut 0.6)
    height:
      type: string
      description: Hauteur CSS (defaut 400px)
---

## Quand utiliser

Pour visualiser la densite ou l'intensite de phenomenes geolocalises : incidents, observations, activite, population. L'overlay canvas evite toute dependance externe.

## Comment

Appeler `widget_display('heatmap-geo', { points: [{ lat: 48.85, lng: 2.35, intensity: 0.9 }, { lat: 48.86, lng: 2.34, intensity: 0.5 }] })`.

La carte se centre automatiquement sur les points. Les intensites sont normalisees au max si des valeurs depassent 1.

## Erreurs courantes

- Trop de points (>10000) ralentit le rendu canvas — agreger les points proches
- Rayon trop petit (<5px) rend la heatmap invisible a faible zoom
- Oublier le champ `intensity` (obligatoire)
