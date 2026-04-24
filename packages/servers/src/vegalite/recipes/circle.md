---
widget: vegalite-circle
description: Scatter with filled circles (Vega-Lite circle mark).
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
Scatter with slightly softer visual than `point`. Same data shape.
