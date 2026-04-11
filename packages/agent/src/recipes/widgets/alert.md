---
widget: alert
description: Alerte ou notification système
group: simple
schema:
  type: object
  required:
    - title
  properties:
    title:
      type: string
    message:
      type: string
    level:
      type: string
      enum:
        - info
        - warn
        - error
---

## Quand utiliser
Pour signaler une information importante, un avertissement ou une erreur à l'utilisateur. Utile après une action qui nécessite attention (ex: seuil dépassé, opération échouée).

## Comment
1. Déterminer le niveau d'alerte selon le contexte ('info', 'warn', 'error')
2. Appeler `autoui_webmcp_widget_display('alert', { title: 'Quota dépassé', message: 'Le stockage utilisé dépasse 90%', level: 'warn' })`
