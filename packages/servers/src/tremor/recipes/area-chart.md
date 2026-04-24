---
widget: tremor-area-chart
description: Area chart for time series and cumulative trends (Tremor).
group: tremor
schema:
  type: object
  required: [data, index, categories]
  properties:
    title: { type: string }
    data: { type: array, description: Array of row objects }
    index: { type: string, description: Key used for x-axis (e.g. 'date') }
    categories: { type: array, description: Keys of numeric series to plot }
    colors: { type: array, description: "Tremor color names: blue, emerald, rose, ..." }
    curveType: { type: string, description: "linear | monotone | step | natural" }
    stack: { type: boolean }
    showLegend: { type: boolean }
    showGridLines: { type: boolean }
---

## When to use
Time series with one or more numeric series, trends over time, cumulative sums.

## Example
```
tremor_webmcp_widget_display({name: "tremor-area-chart", params: {
  data: [{date:'Jan', Sales: 2890}, {date:'Feb', Sales: 2756}],
  index: 'date', categories: ['Sales'], colors: ['blue']
}})
```
