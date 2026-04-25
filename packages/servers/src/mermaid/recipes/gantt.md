---
widget: mermaid-gantt
description: Gantt chart for project scheduling with tasks organized in sections.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid gantt definition"
    title:
      type: string
    dateFormat:
      type: string
      description: "Date format, default YYYY-MM-DD"
    sections:
      type: array
      items:
        type: object
        required: [name, tasks]
        properties:
          name:
            type: string
          tasks:
            type: array
            items:
              type: object
              required: [name, start, duration]
              properties:
                name:
                  type: string
                start:
                  type: string
                duration:
                  type: string
                  description: "e.g. 5d, 2w"
                status:
                  type: string
                  enum: [done, active, crit]
---
Renders a Gantt chart. Provide either a raw `definition` or structured `sections` with tasks specifying start dates and durations.

## How
1. Call `mermaid_webmcp_widget_display({name: "gantt", params: {definition: "gantt\n  title Project\n  dateFormat YYYY-MM-DD\n  section Dev\n  Task A :a1, 2025-01-01, 5d\n  Task B :after a1, 3d"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-gantt", params: {definition: "gantt\n  title Website Redesign\n  dateFormat YYYY-MM-DD\n  section Design\n  Wireframes :done, d1, 2025-03-01, 7d\n  Mockups :active, d2, after d1, 5d\n  section Development\n  Frontend :f1, after d2, 10d\n  Backend :f2, after d2, 8d\n  section Launch\n  QA :after f1, 4d\n  Deploy :crit, 2025-04-10, 2d"}})
```
