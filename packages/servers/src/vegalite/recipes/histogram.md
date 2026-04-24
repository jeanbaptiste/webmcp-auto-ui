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
