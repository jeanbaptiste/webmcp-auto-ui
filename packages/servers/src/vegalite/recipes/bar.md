---
widget: vegalite-bar
description: Bar chart (Vega-Lite). Comparisons across categories, optionally stacked or grouped by series.
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, series?}]. Alternative: provide parallel x and y arrays." }
    x: { type: array, description: "Parallel x values (used if `values` not provided)" }
    y: { type: array, description: "Parallel y values (used if `values` not provided)" }
    series: { type: array, description: "Parallel series labels for grouping/stacking" }
    horizontal: { type: boolean, description: "Horizontal bars (default false)" }
    stack: { type: string, description: "'zero' (stacked), 'normalize' (100%), null (grouped)" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Compare numeric values across categories. Use `series` + `stack: 'zero'` for stacked bars.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-bar", params: { x: ["A","B","C"], y: [10,20,15], title: "Sales" }})
```
