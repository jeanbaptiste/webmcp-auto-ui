---
widget: nivo-swarmplot
description: Swarm plot — force-based dot distribution across groups.
group: nivo
schema:
  type: object
  required: [data, groups]
  properties:
    data: { type: array, description: "[{id, group, value}, ...]" }
    groups: { type: array, description: "Ordered group labels" }
    groupBy: { type: string, description: "Row property with group (default 'group')" }
    value: { type: string, description: "Row property with value (default 'value')" }
    size: { type: number, description: Dot size (default 8) }
---

## When to use
Show distribution of points across categorical groups without overlap.

## Example
```
nivo_webmcp_widget_display({name: "nivo-swarmplot", params: { data: [{id:1, group:'A', value:2}], groups:['A','B','C'] }})
```
