---
widget: trombinoscope
description: Grille de personnes avec badges
group: rich
schema:
  type: object
  required:
    - people
  properties:
    title:
      type: string
    people:
      type: array
      items:
        type: object
        required:
          - name
        properties:
          name:
            type: string
          subtitle:
            type: string
          badge:
            type: string
          color:
            type: string
    columns:
      type: number
---

## Quand utiliser
Pour afficher une grille de personnes — équipe, membres d'un groupe, participants. Chaque personne peut avoir un badge et une couleur distinctive.

## Comment
1. Récupérer la liste des personnes via MCP
2. Appeler `autoui_webmcp_widget_display('trombinoscope', { title: 'Équipe Dev', people: [{ name: 'Alice', subtitle: 'Lead', badge: 'PM', color: '#4CAF50' }], columns: 3 })`
