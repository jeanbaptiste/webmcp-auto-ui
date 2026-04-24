---
widget: observable-plot-waffle
description: Waffle chart (unit chart). Each unit represents a count or share.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    orientation: { type: string, description: "'x' (waffleX) or 'y' (waffleY, default)" }
    fill: { type: string }
    unit: { type: number, description: "Value represented by each cell" }
---

## When to use
Visualize proportions / counts as grids of small squares.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-waffle", params: { data: [{cat:'A',n:10}], xKey:'cat', yKey:'n' }})
```
