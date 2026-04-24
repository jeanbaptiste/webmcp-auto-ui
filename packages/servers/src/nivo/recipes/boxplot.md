---
widget: nivo-boxplot
description: Box plot — distributions with median, quartiles, whiskers.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data: { type: array, description: "[{group, subgroup, value}, ...] — one row per observation" }
    axisBottomLegend: { type: string }
    axisLeftLegend: { type: string }
---

## When to use
Compare distributions across categorical groups.

## Example
```
nivo_webmcp_widget_display({name: "nivo-boxplot", params: { data: [{group:'A', subgroup:'x', value:3},{group:'A', subgroup:'x', value:7},{group:'B', subgroup:'x', value:5}] }})
```
