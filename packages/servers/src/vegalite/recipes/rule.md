---
widget: vegalite-rule
description: Reference rules — horizontal or vertical lines across the plot (Vega-Lite rule mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x}] for vertical or [{y}] for horizontal" }
    orientation: { type: string, description: "'v' (default) or 'h'" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Overlay thresholds or reference values. Often layered on top of other marks.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-rule", params: { title: "SLA thresholds", values: [{y:200},{y:500}], orientation: "h", color: "red", yLabel: "Latency (ms)" }})
```
