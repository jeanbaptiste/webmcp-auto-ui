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
