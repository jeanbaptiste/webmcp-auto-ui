---
widget: nivo-radar
description: Radar / spider chart — compare multiple quantitative variables across items.
group: nivo
schema:
  type: object
  required: [data, keys]
  properties:
    data: { type: array, description: "Rows [{ axis: 'dim1', A: 10, B: 20 }, ...]" }
    keys: { type: array, description: "Series keys, e.g. ['A', 'B']" }
    indexBy: { type: string, description: "Row property used as axis label (default 'id')" }
---

## When to use
Compare multiple items across 3+ quantitative dimensions.

## Example
```
nivo_webmcp_widget_display({name: "nivo-radar", params: { data: [{axis:'speed', A:8, B:4}], keys:['A','B'], indexBy:'axis' }})
```
