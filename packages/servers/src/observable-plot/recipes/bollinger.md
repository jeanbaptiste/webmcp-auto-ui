---
widget: observable-plot-bollinger
description: Bollinger bands (moving average ± k standard deviations) for a time series.
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
    n: { type: number, description: "Window size (default 20)" }
    k: { type: number, description: "Number of standard deviations (default 2)" }
---

## When to use
Financial time series, volatility bands.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-bollinger", params: { data: [...], xKey:'date', yKey:'close', n:20, k:2 }})
```
