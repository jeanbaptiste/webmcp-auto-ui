---
widget: gantt
description: Gantt chart for project timelines and task scheduling (Mermaid.js)
group: mermaid
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid gantt syntax"
    title:
      type: string
      description: "Chart title — used with structured data"
    dateFormat:
      type: string
      description: "Date format (default: YYYY-MM-DD) — used with structured data"
    sections:
      type: array
      description: "Structured sections [{name, tasks}] — alternative to definition"
      items:
        type: object
        properties:
          name:
            type: string
          tasks:
            type: array
            items:
              type: object
              properties:
                name:
                  type: string
                start:
                  type: string
                  description: "Start date (YYYY-MM-DD) or 'after taskId'"
                duration:
                  type: string
                  description: "Duration like '30d', '2w', '3m'"
                id:
                  type: string
                status:
                  type: string
                  description: "done, active, crit, or empty"
---

## When to use
For project planning, sprint timelines, release schedules. Shows tasks on a timeline grouped by section with dependencies.

## How
**Raw syntax:**
```
widget_display('gantt', { definition: "gantt\n  title Release Plan\n  dateFormat YYYY-MM-DD\n  section Backend\n    API design     :done, api, 2024-01-01, 14d\n    Implementation :active, impl, after api, 30d\n  section Frontend\n    UI mockups     :ui, 2024-01-08, 7d\n    Integration    :after impl, 14d" })
```

**Structured data:**
```
widget_display('gantt', {
  title: "Release Plan",
  sections: [
    {
      name: "Backend",
      tasks: [
        { name: "API design", start: "2024-01-01", duration: "14d", id: "api", status: "done" },
        { name: "Implementation", start: "after api", duration: "30d", id: "impl", status: "active" }
      ]
    },
    {
      name: "Frontend",
      tasks: [
        { name: "UI mockups", start: "2024-01-08", duration: "7d", id: "ui" },
        { name: "Integration", start: "after impl", duration: "14d" }
      ]
    }
  ]
})
```

## Common errors
- Date format must match `dateFormat` declaration
- Task IDs must not contain spaces
- `after taskId` references must point to previously defined tasks
