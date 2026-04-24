---
widget: vega-bar
description: Bar chart via Vega grammar. Compare values across categories.
group: vega
schema:
  type: object
  required: [x, y]
  properties:
    title: { type: string }
    x: { type: array, description: Category labels (vertical) or values (horizontal) }
    y: { type: array, description: Values (vertical) or category labels (horizontal) }
    orientation: { type: string, description: "'v' (default) or 'h'" }
    color: { type: string, description: Bar color (CSS) }
    xLabel: { type: string }
    yLabel: { type: string }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-bar", params: { x: ["A","B","C"], y: [10,20,15], title: "Sales" } })
```
