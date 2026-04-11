---
widget: kv
description: Paires clé-valeur (propriétés, métadonnées)
group: simple
schema:
  type: object
  required:
    - rows
  properties:
    title:
      type: string
    rows:
      type: array
      items:
        type: array
        items:
          type: string
        minItems: 2
        maxItems: 2
---

## Quand utiliser
Pour afficher des propriétés ou métadonnées sous forme de paires clé-valeur. Idéal pour les fiches détaillées, les configurations, les résumés structurés.

## Comment
1. Récupérer les données via MCP (ex: détails d'un enregistrement, propriétés d'un objet)
2. Formater en tableau de paires : `[['Nom', 'Alice'], ['Email', 'alice@example.com']]`
3. Appeler `autoui_webmcp_widget_display('kv', { title: 'Détails utilisateur', rows: [['Nom', 'Alice'], ['Email', 'alice@example.com']] })`

## Erreurs courantes
- Passer un objet `{key: value}` au lieu d'un tableau de paires `[[key, value]]`
