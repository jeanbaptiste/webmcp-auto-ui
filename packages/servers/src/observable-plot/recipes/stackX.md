---
widget: observable-plot-stackX
description: Stacked bar chart along X.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    fill: { type: string }
    offset: { type: string }
    order: { type: string }
---

## When to use
Horizontal stacked bars.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-stackX", params: { data: [...], yKey:'cat', xKey:'val', fill:'group' }})
```
