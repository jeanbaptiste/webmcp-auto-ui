---
widget: recharts-scatter
description: Scatter (or bubble) chart — plot (x, y) pairs with optional z-size per series.
group: recharts
schema:
  type: object
  required: [series]
  properties:
    series:
      type: array
      description: "[{name?, rows: [{x,y,z?}], color?}]"
    xKey: { type: string, description: "default 'x'" }
    yKey: { type: string, description: "default 'y'" }
    zKey: { type: string, description: "bubble size key (optional)" }
---

## When to use
Correlation between two (or three with z) numeric variables.

## Example
```
recharts_webmcp_widget_display({name: "recharts-scatter", params: {
  series: [
    {name:'A', rows:[{x:1,y:2,z:10},{x:3,y:4,z:30}]},
    {name:'B', rows:[{x:2,y:5,z:20},{x:4,y:1,z:50}]}
  ],
  zKey: 'z'
}})
```
