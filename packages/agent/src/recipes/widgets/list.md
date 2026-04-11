---
widget: list
description: Liste ordonnée d'items
group: simple
schema:
  type: object
  required:
    - items
  properties:
    title:
      type: string
    items:
      type: array
      items:
        type: string
---

## Quand utiliser
Pour afficher une liste simple d'éléments textuels — résultats de recherche, étapes, noms, éléments d'inventaire. Préférer `data-table` si les items ont plusieurs champs.

## Comment
1. Récupérer les données via MCP
2. Extraire les éléments en tableau de strings
3. Appeler `autoui_webmcp_widget_display('list', { title: 'Résultats', items: ['Item 1', 'Item 2', 'Item 3'] })`
