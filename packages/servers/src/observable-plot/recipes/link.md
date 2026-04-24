---
widget: observable-plot-link
description: Line between (x1,y1) and (x2,y2). Supports curves. No arrowhead.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    x1: { type: string }
    x2: { type: string }
    y1: { type: string }
    y2: { type: string }
    stroke: { type: string }
    strokeWidth: { type: number }
    curve: { type: string }
---

## When to use
Node-link diagrams, dumbbell plots, slope graphs.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-link", params: { data: [{x1:0,y1:0,x2:2,y2:3}], x1:'x1',y1:'y1',x2:'x2',y2:'y2' }})
```
