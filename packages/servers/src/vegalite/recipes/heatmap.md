---
widget: vegalite-heatmap
description: Heatmap (rect mark) — 2D categorical grid coloured by a numeric value.
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, value}]" }
    scheme: { type: string, description: "Color scheme (viridis, magma, blues, ...)" }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Show intensity across two categorical dimensions (correlation matrix, calendar heatmap, etc).
