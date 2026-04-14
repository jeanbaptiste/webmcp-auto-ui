---
widget: plotly-scatter
description: 2D scatter plot with markers and/or lines. Correlations, time series, clusters.
group: plotly
schema:
  type: object
  required: [x, y]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: X-axis values }
    y: { type: array, items: { type: number }, description: Y-axis values }
    mode: { type: string, description: "Trace mode: 'markers', 'lines', 'lines+markers' (default 'markers')" }
    text: { type: array, items: { type: string }, description: Hover text per point }
    markerSize: { type: number, description: Marker size in px (default 6) }
    color: { type: array, items: { type: number }, description: Numeric color values for colorscale }
    xLabel: { type: string, description: X-axis label }
    yLabel: { type: string, description: Y-axis label }
---

## When to use
Display correlations, clusters, or time-series as a 2D scatter plot.

## Example
```
plotly_webmcp_widget_display({name: "plotly-scatter", params: { x: [1,2,3,4,5], y: [2,4,1,5,3], mode: 'lines+markers', title: 'Sample' }})
```
