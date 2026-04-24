---
widget: observable-plot-stackY
description: Stacked bar chart along Y (bars partitioned by a third series).
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    fill: { type: string, description: "Series/category field to stack by" }
    offset: { type: string, description: "'normalize', 'center', 'wiggle'" }
    order: { type: string }
---

## When to use
Part-of-whole comparisons across categories.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-stackY", params: { data: [{c:'A',s:'x',v:1},{c:'A',s:'y',v:2}], xKey:'c', yKey:'v', fill:'s' }})
```
