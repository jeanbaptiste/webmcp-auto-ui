---
widget: canvas2d-timeline
description: Timeline — horizontal event blocks on time axis
group: canvas2d
schema:
  type: object
  required: [events]
  properties:
    title: { type: string }
    events:
      type: array
      items:
        type: object
        required: [label, start, end]
        properties:
          label: { type: string }
          start: { type: number }
          end: { type: number }
          category: { type: string }
---

## When to use
Visualize scheduled events, Gantt-style tasks, or time ranges.

## How
```
widget_display({name: "canvas2d-timeline", params: {
  title: 'Project phases',
  events: [
    { label: 'Design', start: 0, end: 3, category: 'plan' },
    { label: 'Dev', start: 2, end: 8, category: 'build' },
    { label: 'Test', start: 7, end: 10, category: 'qa' }
  ]
}})
```
