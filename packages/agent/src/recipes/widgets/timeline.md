---
widget: timeline
description: Chronologie d'événements avec statut
group: rich
schema:
  type: object
  required:
    - events
  properties:
    title:
      type: string
    events:
      type: array
      items:
        type: object
        required:
          - title
        properties:
          date:
            type: string
          title:
            type: string
          description:
            type: string
          status:
            type: string
            enum:
              - done
              - active
              - pending
---

## Quand utiliser
Pour afficher une séquence d'événements chronologiques — historique, étapes d'un processus, journal d'activité. Chaque événement peut avoir un statut (done/active/pending).

## Comment
1. Récupérer les événements via MCP, les trier chronologiquement
2. Appeler `autoui_webmcp_widget_display('timeline', { title: 'Historique commande', events: [{ date: '2024-01-15', title: 'Commande passée', status: 'done' }, { date: '2024-01-16', title: 'Expédition', status: 'active' }] })`
