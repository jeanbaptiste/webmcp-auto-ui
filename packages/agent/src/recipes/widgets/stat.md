---
widget: stat
description: Statistique clé (KPI, compteur, total)
group: simple
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
    trend:
      type: string
    trendDir:
      type: string
      enum:
        - up
        - down
        - neutral
---

## Quand utiliser
Pour afficher un chiffre clé unique — KPI, compteur, total, score. Idéal quand l'utilisateur demande "combien de…" ou un résumé chiffré.

## Comment
1. Récupérer la donnée via l'outil MCP approprié (ex: requête SQL, appel API)
2. Appeler `autoui_webmcp_widget_display('stat', { label: 'Utilisateurs actifs', value: '1 247' })`
3. Optionnel : ajouter `trend` (ex: '+12%') et `trendDir` ('up'/'down'/'neutral') pour indiquer l'évolution

## Erreurs courantes
- Passer `value` comme nombre au lieu de string — toujours convertir en string
- Oublier de formater le nombre (séparateurs de milliers, unités)
