---
id: rough-gantt
name: Gantt Chart
description: Horizontal bars showing task schedules and durations
data:
  tasks:
    - { name: "Research", start: 0, end: 3 }
    - { name: "Design", start: 2, end: 5 }
    - { name: "Development", start: 4, end: 9 }
    - { name: "Testing", start: 8, end: 11 }
    - { name: "Launch", start: 11, end: 12 }
  title: "Project Timeline"
---

## Gantt Chart

Horizontal bars representing task durations and overlaps.

### Data format

- `tasks` — array of `{name, start, end}` objects (numeric scale)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "gantt", params: {tasks: [{name: "Research", start: 0, end: 3}, {name: "Design", start: 2, end: 5}, {name: "Dev", start: 4, end: 9}], title: "Project Timeline"}})`
