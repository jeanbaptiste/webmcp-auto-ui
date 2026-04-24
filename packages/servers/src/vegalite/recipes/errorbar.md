---
widget: vegalite-errorbar
description: Error bars (CI / SE / custom bounds) per category (Vega-Lite).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}] aggregated, or [{x, yMin, yMax}] explicit bounds" }
    extent: { type: string, description: "'ci' (default), 'stdev', 'stderr', 'iqr'" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Show uncertainty around mean / median per category.
