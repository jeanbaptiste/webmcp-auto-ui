---
widget: agcharts-bar
description: Horizontal bar chart. Compare values across categories with long category labels.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string, description: Chart title }
    data: { type: array, description: "Rows e.g. [{x:'A', y:10}, ...]" }
    x: { type: array, description: "Category labels (parallel array form)" }
    y: { type: array, description: "Values (parallel array form)" }
    xKey: { type: string, description: "Key for category (default 'x')" }
    yKey: { type: string, description: "Key for value (default 'y')" }
    xName: { type: string }
    yName: { type: string }
    stacked: { type: boolean }
---

## When to use
Compare values across categories — horizontal bars are best for long labels.

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-bar", params: { data: [{x:'A', y:10},{x:'B', y:20}], title: 'Sales' }})
```
