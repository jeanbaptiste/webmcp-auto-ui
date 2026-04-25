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

## How
1. Call `mermaid_webmcp_widget_display({name: "kanban", params: {definition: "kanban\n  Todo\n    Task 1\n    Task 2\n  Done\n    Task 3"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-kanban", params: {definition: "kanban\n  Backlog\n    Write specs\n    Set up CI\n  In Progress\n    Implement auth\n    Design home page\n  Review\n    Fix login bug\n  Done\n    Project setup\n    DB schema"}})
```
