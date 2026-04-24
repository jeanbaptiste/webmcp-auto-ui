---
widget: vegalite-regression
description: Scatter + regression fit line (linear / poly / log / exp / pow / quad).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}]" }
    method: { type: string, description: "linear (default) | log | exp | pow | quad | poly" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Explore a two-variable relationship with a fitted trend.
