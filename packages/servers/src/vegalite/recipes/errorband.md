---
widget: vegalite-errorband
description: Shaded confidence band along a continuous x (Vega-Lite errorband mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}] or [{x, yMin, yMax}]" }
    extent: { type: string }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Regression confidence band, forecast uncertainty, etc.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-errorband", params: { title: "Forecast with confidence band", values: [{x:1,yMin:18,yMax:22},{x:2,yMin:20,yMax:26},{x:3,yMin:22,yMax:30},{x:4,yMin:25,yMax:35},{x:5,yMin:28,yMax:40}], xLabel: "Week", yLabel: "Value" }})
```
