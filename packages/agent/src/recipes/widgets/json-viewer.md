---
widget: json-viewer
description: Visualiseur JSON interactif avec expansion/contraction
group: rich
schema:
  type: object
  required:
    - data
  properties:
    title:
      type: string
    data: {}
    maxDepth:
      type: number
    expanded:
      type: boolean
---

## Quand utiliser
Pour afficher des données JSON brutes de manière interactive — réponses API, configurations, structures de données complexes. L'utilisateur peut explorer l'arborescence en dépliant les niveaux.

## Comment
1. Récupérer les données JSON via MCP
2. Appeler `autoui_webmcp_widget_display('json-viewer', { title: 'Réponse API', data: { users: [...] }, maxDepth: 3, expanded: false })`

## Erreurs courantes
- Passer une string JSON au lieu d'un objet — `data` attend un objet/tableau, pas une string
