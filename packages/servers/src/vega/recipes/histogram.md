---
widget: vega-histogram
description: Histogram of a numeric distribution (auto binning).
group: vega
schema:
  type: object
  required: [values]
  properties:
    title: { type: string }
    values: { type: array, description: Array of numbers }
    maxbins: { type: number, description: Max number of bins (default 30) }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-histogram", params: { values:[1,2,2,3,3,3,4,5,5,6,7,7,8] } })
```
