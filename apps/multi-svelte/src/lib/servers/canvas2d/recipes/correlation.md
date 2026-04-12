---
widget: canvas2d-correlation
description: Correlation matrix — heatmap of correlation coefficients
group: canvas2d
schema:
  type: object
  required: [matrix]
  properties:
    title: { type: string }
    matrix:
      type: array
      description: "Square matrix of values in [-1, 1]"
      items: { type: array, items: { type: number } }
    labels: { type: array, items: { type: string } }
---

## When to use
Visualize pairwise correlations between variables.

## How
```
widget_display({name: "canvas2d-correlation", params: {
  title: 'Feature correlations',
  labels: ['height', 'weight', 'age'],
  matrix: [
    [1.0, 0.8, 0.2],
    [0.8, 1.0, 0.3],
    [0.2, 0.3, 1.0]
  ]
}})
```
