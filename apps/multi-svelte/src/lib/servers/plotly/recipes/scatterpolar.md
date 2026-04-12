---
widget: plotly-scatterpolar
description: Polar/radar chart — scatter on polar coordinates.
group: plotly
schema:
  type: object
  required: [r, theta]
  properties:
    title: { type: string, description: Chart title }
    r: { type: array, items: { type: number }, description: Radial values }
    theta: { type: array, items: { type: string }, description: Angular labels or values }
    mode: { type: string, description: "'lines+markers' (default)" }
    fill: { type: string, description: "'toself' (default), 'none'" }
    name: { type: string, description: Trace name }
---

## When to use
Radar/spider charts for multi-axis comparisons (skills, ratings, metrics).

## Example
```
widget_display('plotly-scatterpolar', { r: [4,3,5,2,4], theta: ['Speed','Power','Range','Defense','Speed'], fill: 'toself' })
```
