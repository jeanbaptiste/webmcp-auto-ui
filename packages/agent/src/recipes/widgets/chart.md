---
widget: chart
description: Graphique à barres simples
group: simple
schema:
  type: object
  required:
    - bars
  properties:
    title:
      type: string
    bars:
      type: array
      items:
        type: array
        items:
          - type: string
          - type: number
        minItems: 2
        maxItems: 2
---

## Quand utiliser
Pour un graphique à barres rapide avec des données catégorielles simples. Préférer `chart-rich` pour les graphiques multi-séries, les lignes ou les camemberts.

## Comment
1. Récupérer les données via MCP (ex: comptages par catégorie)
2. Formater en tableau de paires `[label, valeur]`
3. Appeler `autoui_webmcp_widget_display('chart', { title: 'Ventes par région', bars: [['Nord', 150], ['Sud', 230], ['Est', 180]] })`

## Erreurs courantes
- Inverser label et valeur dans les paires — le format est `[string, number]`, pas `[number, string]`
