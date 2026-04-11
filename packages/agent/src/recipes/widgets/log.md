---
widget: log
description: Journal d'événements avec niveaux et timestamps
group: rich
schema:
  type: object
  required:
    - entries
  properties:
    title:
      type: string
    entries:
      type: array
      items:
        type: object
        required:
          - message
        properties:
          timestamp:
            type: string
          level:
            type: string
            enum:
              - debug
              - info
              - warn
              - error
          message:
            type: string
          source:
            type: string
---

## Quand utiliser
Pour afficher un journal d'événements — logs applicatifs, audit trail, historique d'opérations. Chaque entrée peut être colorée par niveau (debug/info/warn/error).

## Comment
1. Récupérer les logs via MCP
2. Appeler `autoui_webmcp_widget_display('log', { title: 'Logs serveur', entries: [{ timestamp: '14:32:01', level: 'error', message: 'Connection refused', source: 'db' }, { timestamp: '14:32:05', level: 'info', message: 'Retry successful', source: 'db' }] })`
