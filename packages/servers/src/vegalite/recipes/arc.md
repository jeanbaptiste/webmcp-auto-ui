---
widget: vegalite-arc
description: Pie / donut chart (Vega-Lite arc mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{label, value}]" }
    innerRadius: { type: number, description: "> 0 for donut" }
    scheme: { type: string }
---

## When to use
Show part-to-whole with small number of categories. Prefer bar for >6 slices.
