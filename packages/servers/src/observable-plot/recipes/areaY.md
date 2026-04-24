---
widget: observable-plot-areaY
description: Area chart along Y (vertical fill between baseline and Y).
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
    fill: { type: string }
    fillOpacity: { type: number }
    curve: { type: string }
---

## When to use
Filled time series (area under curve).

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-areaY", params: { x:[1,2,3,4], y:[1,4,9,16] }})
```
