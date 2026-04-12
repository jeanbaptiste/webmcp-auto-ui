---
widget: canvas2d-area-chart
description: Area chart — line with filled region beneath
group: canvas2d
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, items: { type: number } }
    series:
      type: array
      items:
        type: object
        required: [values]
        properties:
          name: { type: string }
          values: { type: array, items: { type: number } }
---

## When to use
Emphasize volume or cumulative value over time.

## How
```
widget_display({name: "canvas2d-area-chart", params: {
  title: 'Revenue trend',
  values: [10, 25, 18, 32, 45, 38]
}})
```
