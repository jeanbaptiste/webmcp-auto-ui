---
widget: agcharts-waterfall
description: Waterfall — running total of positive/negative deltas.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Rows like {x, y} where y can be negative" }
    xKey: { type: string }
    yKey: { type: string }
    direction: { type: string, description: "'vertical' (default) or 'horizontal'" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-waterfall", params: { data:[{x:'Start',y:100},{x:'Sales',y:50},{x:'Cost',y:-30}] }})
```
