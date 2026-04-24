---
widget: vegalite-density
description: Kernel density estimate (Vega-Lite density transform).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{value, series?}]" }
    bandwidth: { type: number, description: "0 = auto" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Smoothed distribution of one numeric variable, optionally split by series.
