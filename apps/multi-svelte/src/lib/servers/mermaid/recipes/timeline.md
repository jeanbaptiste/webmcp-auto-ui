---
widget: mermaid-timeline
description: Timeline showing events organized by time periods/sections.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid timeline definition"
    title:
      type: string
    sections:
      type: array
      items:
        type: object
        required: [period, events]
        properties:
          period:
            type: string
            description: "Time period label"
          events:
            type: array
            items:
              type: string
---
Renders a timeline. Provide either a raw `definition` or structured `sections` with periods and events.
