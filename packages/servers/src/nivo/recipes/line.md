---
widget: nivo-line
description: Line chart with multiple series. Supports area fill, many curve types.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data: { type: array, description: "Series [{ id, data: [{x, y}, ...] }, ...]" }
    xScaleType: { type: string, description: "'point' (default), 'linear', 'time'" }
    yScaleType: { type: string, description: "'linear' (default), 'log'" }
    curve: { type: string, description: "'monotoneX' (default), 'linear', 'step', 'cardinal', 'catmullRom', 'basis', 'natural'" }
    enableArea: { type: boolean, description: Fill area under the line }
    axisBottomLegend: { type: string }
    axisLeftLegend: { type: string }
---

## When to use
Time series or ordered-x plots with one or more series.

## Example
```
nivo_webmcp_widget_display({name: "nivo-line", params: { data: [{id:'A', data:[{x:'jan', y:1},{x:'feb', y:3}]}] }})
```
