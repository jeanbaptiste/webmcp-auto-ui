---
widget: vegalite-boxplot
description: Box-and-whisker plot per category (Vega-Lite boxplot mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, series?}] — x categorical, y numeric" }
    extent: { type: number, description: "IQR multiplier for whiskers (default 1.5)" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Summarise distribution (median, quartiles, outliers) across categories.
