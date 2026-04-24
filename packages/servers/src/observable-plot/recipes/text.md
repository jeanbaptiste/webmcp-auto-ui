---
widget: observable-plot-text
description: Place text labels on the chart at (x, y) positions.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Array of {x, y, text}" }
    xKey: { type: string }
    yKey: { type: string }
    textKey: { type: string, description: "Field for the label text (default 'text')" }
    fill: { type: string }
    fontSize: { type: number }
    dx: { type: number }
    dy: { type: number }
    textAnchor: { type: string, description: "'start', 'middle', 'end'" }
    rotate: { type: number }
---

## When to use
Annotations, data labels.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-text", params: { data: [{x:1,y:1,text:'A'},{x:2,y:3,text:'B'}] }})
```
