---
widget: vegalite-text
description: Text labels at (x, y) positions (Vega-Lite text mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, text}]" }
    color: { type: string }
    fontSize: { type: number }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Annotate a plot with labels at specific coordinates.
