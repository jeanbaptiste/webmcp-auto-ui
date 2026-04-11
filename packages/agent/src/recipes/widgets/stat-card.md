---
widget: stat-card
description: Carte statistique enrichie avec tendance et variante
group: rich
schema:
  type: object
  required:
    - label
    - value
  properties:
    label:
      type: string
    value:
      type: string
    unit:
      type: string
    delta:
      type: string
    trend:
      type: string
      enum:
        - up
        - down
        - flat
    previousValue:
      type: string
    variant:
      type: string
      enum:
        - default
        - success
        - warning
        - error
        - info
---

## Quand utiliser
Pour un KPI enrichi avec contexte — delta, valeur précédente, unité, variante colorée. Préférer `stat` pour un chiffre simple sans contexte additionnel.

## Comment
1. Récupérer la métrique et sa valeur de comparaison via MCP
2. Calculer le delta si nécessaire
3. Appeler `autoui_webmcp_widget_display('stat-card', { label: 'Revenus', value: '142k', unit: '€', delta: '+12%', trend: 'up', previousValue: '127k', variant: 'success' })`
