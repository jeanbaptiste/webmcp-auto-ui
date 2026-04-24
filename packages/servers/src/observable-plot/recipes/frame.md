---
widget: observable-plot-frame
description: Draw a frame (bounding rectangle) around the plot area. Optionally overlay dots.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    stroke: { type: string }
---

## When to use
Emphasize plot bounds, compose with other marks.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-frame", params: { stroke: '#888' }})
```
