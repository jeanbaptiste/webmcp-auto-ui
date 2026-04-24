---
widget: vegalite-errorband
description: Shaded confidence band along a continuous x (Vega-Lite errorband mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}] or [{x, yMin, yMax}]" }
    extent: { type: string }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Regression confidence band, forecast uncertainty, etc.
