---
widget: vegalite-loess
description: Scatter + LOESS smoother (Vega-Lite loess transform).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}]" }
    bandwidth: { type: number, description: "0..1 (default 0.3)" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Non-parametric smoothing — detect non-linear patterns without fitting a formula.
