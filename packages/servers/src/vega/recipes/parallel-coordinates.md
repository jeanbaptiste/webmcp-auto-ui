---
widget: vega-parallel-coordinates
description: Parallel coordinates — multivariate rows as connected lines across axes.
group: vega
schema:
  type: object
  required: [rows, dimensions]
  properties:
    title: { type: string }
    rows: { type: array, description: Array of row objects (one per record) }
    dimensions: { type: array, description: Field names (strings) to show as vertical axes }
    colorField: { type: string, description: Optional field name for line color grouping }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-parallel-coordinates", params: { rows:[{a:1,b:2,c:3,g:"x"},{a:2,b:4,c:1,g:"y"}], dimensions:["a","b","c"], colorField:"g" } })
```
