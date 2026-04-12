---
widget: canvas2d-line-chart
description: Line chart with one or multiple series
group: canvas2d
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, items: { type: number }, description: "Single series shorthand" }
    series:
      type: array
      items:
        type: object
        required: [values]
        properties:
          name: { type: string }
          values: { type: array, items: { type: number } }
    labels: { type: array, items: { type: string } }
---

## When to use
Show trends over sequential data points.

## How
```
widget_display({name: "canvas2d-line-chart", params: {
  title: 'Monthly users',
  series: [
    { name: 'Desktop', values: [100,120,115,140,160] },
    { name: 'Mobile', values: [80,95,110,130,150] }
  ]
}})
```
