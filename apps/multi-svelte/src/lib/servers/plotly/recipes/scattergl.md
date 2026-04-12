---
widget: plotly-scattergl
description: WebGL-accelerated scatter plot for large datasets (100k+ points).
group: plotly
schema:
  type: object
  required: [x, y]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: X-axis values }
    y: { type: array, items: { type: number }, description: Y-axis values }
    mode: { type: string, description: "Trace mode (default 'markers')" }
    text: { type: array, items: { type: string }, description: Hover text }
    markerSize: { type: number, description: Marker size (default 4) }
    color: { type: array, items: { type: number }, description: Color values }
    xLabel: { type: string, description: X-axis label }
    yLabel: { type: string, description: Y-axis label }
---

## When to use
Use for large datasets where SVG scatter would be too slow. Same API as scatter but GPU-rendered.

## Example
```
widget_display('plotly-scattergl', { x: [...1000 points], y: [...1000 points], mode: 'markers' })
```
