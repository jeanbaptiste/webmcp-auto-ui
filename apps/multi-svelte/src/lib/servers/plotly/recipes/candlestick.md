---
widget: plotly-candlestick
description: Candlestick chart for financial time series.
group: plotly
schema:
  type: object
  required: [x, open, high, low, close]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: string }, description: Date/time values }
    open: { type: array, items: { type: number }, description: Opening prices }
    high: { type: array, items: { type: number }, description: High prices }
    low: { type: array, items: { type: number }, description: Low prices }
    close: { type: array, items: { type: number }, description: Closing prices }
---

## When to use
Financial data — candlestick chart (green/red bodies with wicks).

## Example
```
plotly_webmcp_widget_display({name: "plotly-candlestick", params: { x: ['2024-01','2024-02','2024-03'], open: [100,110,105], high: [115,120,112], low: [95,105,100], close: [110,105,108] }})
```
