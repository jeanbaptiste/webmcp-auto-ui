---
widget: vegalite-density
description: Kernel density estimate (Vega-Lite density transform).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{value, series?}]" }
    bandwidth: { type: number, description: "0 = auto" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Smoothed distribution of one numeric variable, optionally split by series.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-density", params: { title: "Response time distribution", values: [{value:120},{value:135},{value:98},{value:210},{value:145},{value:160},{value:105},{value:190},{value:130},{value:155}], xLabel: "ms" }})
```
