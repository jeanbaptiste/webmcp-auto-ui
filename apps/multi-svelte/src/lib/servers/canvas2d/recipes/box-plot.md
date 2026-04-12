---
widget: canvas2d-box-plot
description: Box plot — quartile visualization with whiskers
group: canvas2d
schema:
  type: object
  required: [groups]
  properties:
    title: { type: string }
    groups:
      type: array
      items:
        type: object
        required: [label, values]
        properties:
          label: { type: string }
          values: { type: array, items: { type: number } }
---

## When to use
Compare statistical distributions across categories.

## How
```
widget_display({name: "canvas2d-box-plot", params: {
  title: 'Test scores by class',
  groups: [
    { label: 'Class A', values: [72,75,80,85,88,90,92] },
    { label: 'Class B', values: [60,65,70,72,78,82,95] }
  ]
}})
```
