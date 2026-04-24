---
widget: vegalite-tick
description: Strip plot — short vertical ticks showing distribution along a categorical y axis (Vega-Lite).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}] — y is categorical" }
    x: { type: array }
    y: { type: array }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Show one-dimensional distribution across categories (alternative to boxplot).
