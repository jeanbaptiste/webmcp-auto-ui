---
widget: observable-plot-lineX
description: Line with X as the independent variable (Y is implicit, ordinal or index).
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    x: { type: array }
    y: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    stroke: { type: string }
    curve: { type: string }
---

## When to use
Horizontal trend lines where the Y axis is time or index.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-lineX", params: { x: [0,1,2,3] }})
```
