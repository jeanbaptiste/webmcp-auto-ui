---
widget: tags
description: Groupe de tags/badges
group: simple
schema:
  type: object
  required:
    - tags
  properties:
    label:
      type: string
    tags:
      type: array
      items:
        type: object
        required:
          - text
        properties:
          text:
            type: string
          active:
            type: boolean
---

## Quand utiliser
Pour afficher des catégories, des labels, des filtres ou des badges. Utile pour montrer les tags associés à un élément ou proposer des filtres visuels.

## Comment
1. Récupérer les tags ou catégories depuis MCP
2. Appeler `autoui_webmcp_widget_display('tags', { label: 'Catégories', tags: [{ text: 'Finance', active: true }, { text: 'Tech' }] })`
