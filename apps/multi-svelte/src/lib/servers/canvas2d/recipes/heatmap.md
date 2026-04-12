---
widget: canvas2d-heatmap
description: Colored grid heatmap with cold-to-hot scale
group: canvas2d
schema:
  type: object
  required: [values]
  properties:
    title: { type: string }
    values:
      type: array
      description: "2D array of numbers (rows x cols)"
      items: { type: array, items: { type: number } }
    xLabels: { type: array, items: { type: string } }
    yLabels: { type: array, items: { type: string } }
---

## When to use
Show intensity/magnitude across two categorical dimensions.

## How
```
widget_display({name: "canvas2d-heatmap", params: {
  title: 'Temperature by hour/day',
  values: [[10,15,20],[12,18,25],[8,14,22]],
  xLabels: ['Mon','Tue','Wed'],
  yLabels: ['Morning','Afternoon','Evening']
}})
```
