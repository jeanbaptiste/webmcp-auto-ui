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

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-errorbar", params: { title: "Mean latency ± CI", values: [{x:"API A",yMin:80,yMax:120},{x:"API B",yMin:50,yMax:70},{x:"API C",yMin:110,yMax:160}], xLabel: "Endpoint", yLabel: "Latency (ms)" }})
```
