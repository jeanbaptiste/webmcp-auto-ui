---
widget: cards
description: Grille de cartes avec titre, description et tags
group: rich
schema:
  type: object
  required:
    - cards
  properties:
    title:
      type: string
    cards:
      type: array
      items:
        type: object
        required:
          - title
        properties:
          title:
            type: string
          description:
            type: string
          subtitle:
            type: string
          tags:
            type: array
            items:
              type: string
---

## Quand utiliser
Pour afficher une collection d'éléments riches — produits, articles, projets, événements. Chaque carte combine titre, description et tags. Préférer `list` pour des éléments simples sans structure.

## Comment
1. Récupérer la collection via MCP
2. Appeler `autoui_webmcp_widget_display('cards', { title: 'Projets actifs', cards: [{ title: 'Refonte UI', description: 'Migration vers Svelte 5', subtitle: 'Q2 2024', tags: ['frontend', 'priorité haute'] }] })`
