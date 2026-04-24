---
widget: vegalite-point
description: Scatter plot with hollow/filled point marks (Vega-Lite).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, series?, size?}]" }
    x: { type: array }
    y: { type: array }
    series: { type: array }
    size: { type: number, description: "Constant mark size" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Two-variable relationship. Provide `size` per row for bubble chart.
