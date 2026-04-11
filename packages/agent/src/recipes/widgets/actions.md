---
widget: actions
description: Rangée de boutons d'action
group: simple
schema:
  type: object
  required:
    - buttons
  properties:
    buttons:
      type: array
      items:
        type: object
        required:
          - label
        properties:
          label:
            type: string
          primary:
            type: boolean
---

## Quand utiliser
Pour proposer des choix d'action à l'utilisateur — confirmation, navigation, ou sélection parmi plusieurs options.

## Comment
1. Identifier les actions pertinentes selon le contexte
2. Appeler `autoui_webmcp_widget_display('actions', { buttons: [{ label: 'Confirmer', primary: true }, { label: 'Annuler' }] })`
