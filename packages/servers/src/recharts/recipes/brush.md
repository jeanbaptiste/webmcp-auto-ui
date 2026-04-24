---
widget: recharts-brush
description: Line chart with interactive Brush + ReferenceArea/ReferenceLine annotations.
group: recharts
schema:
  type: object
  required: [rows, lines]
  properties:
    rows: { type: array }
    xKey: { type: string, description: "default 'x'" }
    lines:
      type: array
      description: "[{dataKey, color?}]"
    refAreas:
      type: array
      description: "[{x1, x2, y1?, y2?, color?, label?}]"
    refLines:
      type: array
      description: "[{x?, y?, color?, label?}]"
---

## When to use
Long series that benefit from zoom (Brush), with called-out regions (ReferenceArea/Line).

## Example
```
recharts_webmcp_widget_display({name: "recharts-brush", params: {
  rows: [{x:1,v:4},{x:2,v:8},{x:3,v:5},{x:4,v:9},{x:5,v:11}],
  lines: [{dataKey:'v'}],
  refAreas: [{x1:2, x2:3, label:'spike'}],
  refLines: [{y:8, label:'target'}]
}})
```
