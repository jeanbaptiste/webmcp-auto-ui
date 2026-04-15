---
widget: trombinoscope
description: People grid with badges
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

## When to use
Display a grid of people — team, group members, participants. Each person can have a badge and a distinctive color.

## How to use
1. Retrieve the list of people via MCP
2. Call `autoui_webmcp_widget_display('trombinoscope', { title: 'Dev Team', people: [{ name: 'Alice', subtitle: 'Lead', badge: 'PM', color: '#4CAF50' }], columns: 3 })`

## Common mistakes
- NEVER fabricate image URLs for the `avatar` field. Use ONLY the URLs returned by MCP tools. If no URL is available, do not include an avatar field — the widget will display initials automatically.
