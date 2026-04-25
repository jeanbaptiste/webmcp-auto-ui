---
widget: vegalite-point
description: Scatter plot with hollow/filled point marks (Vega-Lite).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, series?, size?}]" }
    x: { type: array }
    y: { type: array }
    series: { type: array }
    size: { type: number, description: "Constant mark size" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Two-variable relationship. Provide `size` per row for bubble chart.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-point", params: { title: "GDP vs Life expectancy", values: [{x:12000,y:72},{x:45000,y:81},{x:8000,y:65},{x:30000,y:79},{x:55000,y:83},{x:5000,y:60}], xLabel: "GDP per capita ($)", yLabel: "Life expectancy (yrs)" }})
```
