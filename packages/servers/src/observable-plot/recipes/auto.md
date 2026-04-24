---
widget: observable-plot-auto
description: Smart chart — Plot picks the most appropriate mark from the data types.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    colorKey: { type: string }
    sizeKey: { type: string }
    mark: { type: string, description: "Force a mark type (bar, dot, line, area, rect)" }
---

## When to use
Quick exploratory viz without committing to a mark type.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-auto", params: { data: [{c:'A',v:1},{c:'B',v:2}], xKey:'c', yKey:'v' }})
```
