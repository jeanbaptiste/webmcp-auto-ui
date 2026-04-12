---
widget: canvas2d-radial-bar
description: Radial bar chart — concentric progress arcs
group: canvas2d
schema:
  type: object
  required: [items]
  properties:
    title: { type: string }
    items:
      type: array
      items:
        type: object
        required: [label, value]
        properties:
          label: { type: string }
          value: { type: number }
          max: { type: number }
---

## When to use
Compare multiple metrics against their maximum as circular progress.

## How
```
widget_display('canvas2d-radial-bar', {
  title: 'Sprint progress',
  items: [
    { label: 'Stories', value: 8, max: 12 },
    { label: 'Bugs', value: 3, max: 5 },
    { label: 'Tasks', value: 15, max: 20 }
  ]
})
```
