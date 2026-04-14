---
widget: canvas2d-scatter
description: 2D scatter plot with optional category colors (10K+ points)
group: canvas2d
schema:
  type: object
  required: [points]
  properties:
    title: { type: string }
    points:
      type: array
      items:
        type: object
        required: [x, y]
        properties:
          x: { type: number }
          y: { type: number }
          size: { type: number, description: "Point radius (1.5-8)" }
          category: { type: string }
          label: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Visualize distribution and clusters in bivariate data. Pure Canvas 2D, handles 10K+ points.

## How
```
widget_display({name: "canvas2d-scatter", params: {
  title: 'Iris dataset',
  points: [
    { x: 5.1, y: 3.5, category: 'setosa' },
    { x: 7.0, y: 3.2, category: 'versicolor' }
  ],
  xLabel: 'Sepal length', yLabel: 'Sepal width'
}})
```
