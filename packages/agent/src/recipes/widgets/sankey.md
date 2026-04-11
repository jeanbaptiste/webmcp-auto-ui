---
widget: sankey
description: Diagramme de Sankey (flux entre nœuds)
group: rich
schema:
  type: object
  required:
    - nodes
    - links
  properties:
    title:
      type: string
    nodes:
      type: array
      items:
        type: object
        required:
          - id
          - label
        properties:
          id:
            type: string
          label:
            type: string
          color:
            type: string
    links:
      type: array
      items:
        type: object
        required:
          - source
          - target
          - value
        properties:
          source:
            type: string
          target:
            type: string
          value:
            type: number
---

## Quand utiliser
Pour visualiser des flux ou transferts entre catégories — budget, conversions, migrations, flux de données. Les nœuds représentent les étapes et les liens les quantités transférées.

## Comment
1. Récupérer les données de flux via MCP
2. Définir les nœuds (étapes) et les liens (flux entre étapes)
3. Appeler `autoui_webmcp_widget_display('sankey', { title: 'Flux budgétaire', nodes: [{ id: 'rev', label: 'Revenus' }, { id: 'sal', label: 'Salaires' }], links: [{ source: 'rev', target: 'sal', value: 50000 }] })`

## Erreurs courantes
- Les `source` et `target` dans les liens doivent correspondre à des `id` existants dans les nœuds
- Ne pas créer de cycles (le flux doit être directionnel)
