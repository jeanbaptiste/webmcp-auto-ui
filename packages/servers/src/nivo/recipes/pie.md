---
widget: nivo-pie
description: Pie / donut chart with arc link labels and legend.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data: { type: array, description: "Slices [{ id, label, value }, ...]" }
    innerRadius: { type: number, description: "0 = pie, 0.5 = donut (default 0.5)" }
    padAngle: { type: number, description: Gap between slices in radians }
    cornerRadius: { type: number, description: Slice corner rounding }
---

## When to use
Show parts of a whole. Prefer bar for >7 categories.

## Example
```
nivo_webmcp_widget_display({name: "nivo-pie", params: { data: [{id:'A', label:'A', value:30},{id:'B', label:'B', value:70}] }})
```
