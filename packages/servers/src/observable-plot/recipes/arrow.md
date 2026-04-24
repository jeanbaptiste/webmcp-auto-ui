---
widget: observable-plot-arrow
description: Arrow mark between (x1,y1) and (x2,y2). Optional curved with 'bend'.
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
    bend: { type: [number, boolean] }
    headLength: { type: number }
    headAngle: { type: number }
---

## When to use
Change arrows, flows, directional annotations.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-arrow", params: { data: [{x1:0,y1:0,x2:1,y2:1}], x1:'x1',y1:'y1',x2:'x2',y2:'y2' }})
```
