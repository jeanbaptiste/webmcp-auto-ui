---
widget: canvas2d-hbar-progress
description: Horizontal progress bars with labels and percentages
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
Show progress or completion across multiple categories.

## How
```
widget_display({name: "canvas2d-hbar-progress", params: {
  title: 'Feature completion',
  items: [
    { label: 'Auth', value: 90, max: 100 },
    { label: 'Dashboard', value: 60, max: 100 },
    { label: 'Reports', value: 30, max: 100 }
  ]
}})
```
