---
widget: nivo-stream
description: Streamgraph — stacked area with organic flow.
group: nivo
schema:
  type: object
  required: [data, keys]
  properties:
    data: { type: array, description: "Rows [{keyA: num, keyB: num, ...}, ...]" }
    keys: { type: array, description: "Series keys to stack" }
    offsetType: { type: string, description: "'silhouette' (default), 'wiggle', 'expand', 'diverging', 'none'" }
---

## When to use
Visualize composition changes over time in a flowing layout.

## Example
```
nivo_webmcp_widget_display({name: "nivo-stream", params: { data: [{A:2,B:5},{A:4,B:3}], keys:['A','B'] }})
```
