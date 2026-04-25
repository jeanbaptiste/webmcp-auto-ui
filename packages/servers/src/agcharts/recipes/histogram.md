---
widget: agcharts-histogram
description: Histogram — distribution of a numeric variable.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Rows like [{x:value}]" }
    xKey: { type: string }
    bins: { description: "Number of bins (int) or array of explicit bin edges" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-histogram", params: { data:[{x:1},{x:1.2},{x:2},{x:2.4},{x:3}], bins:5 }})
```
