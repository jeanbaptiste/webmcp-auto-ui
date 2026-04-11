---
widget: gallery
description: Galerie d'images en grille
group: media
schema:
  type: object
  required:
    - images
  properties:
    title:
      type: string
    images:
      type: array
      items:
        type: object
        required:
          - src
        properties:
          src:
            type: string
          alt:
            type: string
          caption:
            type: string
    columns:
      type: number
---

## Quand utiliser
Pour afficher une collection d'images en grille — galerie photo, résultats de recherche d'images, portfolio. Préférer `carousel` pour un défilement séquentiel.

## Comment
1. Récupérer les URLs d'images via MCP (ne jamais inventer d'URLs)
2. Appeler `autoui_webmcp_widget_display('gallery', { title: 'Photos du site', images: [{ src: 'https://...', alt: 'Vue principale', caption: 'Façade nord' }], columns: 3 })`

## Erreurs courantes
- Ne JAMAIS fabriquer d'URLs d'images — utiliser uniquement celles retournées par les outils MCP
- Toujours fournir un `alt` pour l'accessibilité
