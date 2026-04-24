---
widget: recharts-radial-bar
description: Radial bar chart — bars laid out on concentric arcs. Good for progress or KPI comparison.
group: recharts
schema:
  type: object
  required: [rows]
  properties:
    rows: { type: array, description: "[{name:'A', value:40, fill?:'#...'}]" }
    dataKey: { type: string, description: "default 'value'" }
---

## When to use
Compact KPI dashboards with 3-6 entries measured on the same scale (%).

## Example
```
recharts_webmcp_widget_display({name: "recharts-radial-bar", params: {
  rows: [{name:'A',value:40},{name:'B',value:70},{name:'C',value:90}]
}})
```
