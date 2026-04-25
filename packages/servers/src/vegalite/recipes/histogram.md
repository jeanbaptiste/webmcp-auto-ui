---
widget: vegalite-histogram
description: Histogram with binning (Vega-Lite bar mark + bin transform).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{value, series?}]" }
    maxbins: { type: number, description: "Default 30" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Distribution of a single numeric variable; add `series` to overlay grouped histograms.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-histogram", params: { title: "Age distribution", values: [{value:23},{value:31},{value:45},{value:28},{value:52},{value:34},{value:29},{value:41},{value:37},{value:26},{value:48},{value:33}], maxbins: 10, xLabel: "Age" }})
```
