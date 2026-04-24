---
widget: observable-plot-tick
description: Tick mark (small perpendicular line). Useful for rug plots and strip plots.
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
    orientation: { type: string, description: "'x' (vertical ticks, default) or 'y'" }
    stroke: { type: string }
---

## When to use
Rug plots showing marginal distribution along one axis.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-tick", params: { x: [1,2,3,5,8] }})
```
