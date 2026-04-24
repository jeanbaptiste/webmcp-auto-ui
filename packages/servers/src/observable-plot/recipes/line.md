---
widget: observable-plot-line
description: Line chart (polyline). Connects points in the order they appear.
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
    strokeWidth: { type: number }
    curve: { type: string, description: "linear, catmull-rom, step, basis, monotone-x, natural" }
    marker: { type: [boolean, string] }
    tip: { type: boolean }
---

## When to use
Time series, continuous progressions.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-line", params: { x:[1,2,3,4], y:[1,4,9,16] }})
```
