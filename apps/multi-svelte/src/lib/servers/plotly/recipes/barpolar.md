---
widget: plotly-barpolar
description: Polar bar chart (wind rose, directional data).
group: plotly
schema:
  type: object
  required: [r, theta]
  properties:
    title: { type: string, description: Chart title }
    r: { type: array, items: { type: number }, description: Bar heights (radial) }
    theta: { type: array, items: { type: string }, description: Angular categories }
    color: { type: array, description: Bar colors }
    opacity: { type: number, description: Bar opacity (default 0.8) }
---

## When to use
Wind roses, directional frequency data, cyclic data by angle.

## Example
```
widget_display('plotly-barpolar', { r: [5,8,3,6,4,7,2,9], theta: ['N','NE','E','SE','S','SW','W','NW'] })
```
