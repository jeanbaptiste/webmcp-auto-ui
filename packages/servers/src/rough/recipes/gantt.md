---
widget: rough-gantt
description: Horizontal bars showing task schedules and durations
schema:
  type: object
  required:
    - tasks
  properties:
    tasks:
      type: array
      items:
        type: object
        required:
          - name
          - start
          - end
        properties:
          name:
            type: string
            description: Task name
          start:
            type: number
            description: Start position (numeric scale)
          end:
            type: number
            description: End position (numeric scale)
      description: Task items with duration
    title:
      type: string
      description: Chart title
---

## Gantt Chart

Horizontal bars representing task durations and overlaps.

### Data format

- `tasks` — array of `{name, start, end}` objects (numeric scale)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "gantt", params: {tasks: [{name: "Research", start: 0, end: 3}, {name: "Design", start: 2, end: 5}, {name: "Dev", start: 4, end: 9}], title: "Project Timeline"}})`
