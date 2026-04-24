---
widget: observable-plot-rule
description: Rule mark — a straight line spanning the plot (horizontal or vertical). Useful for thresholds, axes, reference lines.
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
    orientation: { type: string, description: "'x' (vertical rules, default) or 'y'" }
    x1: { type: number }
    x2: { type: number }
    y1: { type: number }
    y2: { type: number }
    stroke: { type: string }
    strokeDasharray: { type: string }
---

## When to use
Thresholds, baselines, reference lines.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-rule", params: { orientation: 'y', y: [0] }})
```
