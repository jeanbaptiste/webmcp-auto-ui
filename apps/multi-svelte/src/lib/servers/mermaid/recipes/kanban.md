---
widget: mermaid-kanban
description: Kanban board with columns and task items.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid kanban definition"
    columns:
      type: array
      items:
        type: object
        required: [title, items]
        properties:
          title:
            type: string
          items:
            type: array
            items:
              type: string
---
Renders a Kanban board. Provide either a raw `definition` or structured `columns` with titles and item lists.
