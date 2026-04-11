---
widget: carousel
description: Carrousel de slides (images ou contenu)
group: media
schema:
  type: object
  required:
    - slides
  properties:
    title:
      type: string
    slides:
      type: array
      items:
        type: object
        properties:
          src:
            type: string
          title:
            type: string
          subtitle:
            type: string
          content:
            type: string
    autoPlay:
      type: boolean
    interval:
      type: number
---

## Quand utiliser
Pour un défilement séquentiel de contenus — présentation, tutoriel étape par étape, galerie narrative. Préférer `gallery` pour une vue d'ensemble en grille.

## Comment
1. Récupérer ou composer les slides
2. Appeler `autoui_webmcp_widget_display('carousel', { title: 'Présentation', slides: [{ title: 'Étape 1', content: 'Introduction au projet...' }, { title: 'Étape 2', src: 'https://...', subtitle: 'Architecture' }], autoPlay: false })`

## Erreurs courantes
- Ne jamais fabriquer d'URLs d'images pour `src` — utiliser uniquement celles retournées par les outils MCP
