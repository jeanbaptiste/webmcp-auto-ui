---
widget: vegalite-square
description: Scatter with square marks (Vega-Lite).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array }
    x: { type: array }
    y: { type: array }
    series: { type: array }
    size: { type: number }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Alternative scatter shape; useful when circles collide visually with other layers.
