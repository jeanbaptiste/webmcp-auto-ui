---
widget: chart-rich
description: Graphique avancé multi-types (barres, lignes, aires, camembert)
group: rich
schema:
  type: object
  required:
    - data
  properties:
    title:
      type: string
    type:
      type: string
      enum:
        - bar
        - line
        - area
        - pie
        - donut
    labels:
      type: array
      items:
        type: string
    data:
      type: array
      items:
        type: object
        required:
          - values
        properties:
          label:
            type: string
          values:
            type: array
            items:
              type: number
          color:
            type: string
---

## Quand utiliser
Pour des graphiques multi-séries ou des types autres que barres simples (lignes, aires, camemberts, donuts). Préférer `chart` pour un graphique à barres basique mono-série.

## Comment
1. Récupérer les données via MCP
2. Structurer en séries avec `labels` (axe X) et `data` (séries de valeurs)
3. Appeler `autoui_webmcp_widget_display('chart-rich', { title: 'Évolution mensuelle', type: 'line', labels: ['Jan', 'Fév', 'Mar'], data: [{ label: '2024', values: [10, 20, 15], color: '#4CAF50' }] })`

## Erreurs courantes
- Le nombre de `values` dans chaque série doit correspondre au nombre de `labels`
- Ne pas confondre avec `chart` (widget simple) — `chart-rich` utilise un format de données différent
