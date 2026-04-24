---
widget: vegalite-trail
description: Line whose stroke width varies with a `size` field (Vega-Lite trail mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, size, series?}]" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Time series where magnitude of a secondary variable modulates line thickness.
