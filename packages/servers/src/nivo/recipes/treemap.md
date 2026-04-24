---
widget: nivo-treemap
description: Treemap — hierarchical rectangles proportional to value.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data:
      type: object
      description: "{ name, children: [{name, value} | {name, children}] }"
    value: { type: string, description: "Leaf value property (default 'value')" }
---

## When to use
Hierarchical proportions on a rectangular layout.

## Example
```
nivo_webmcp_widget_display({name: "nivo-treemap", params: { data: { name:'root', children:[{name:'A', value:10},{name:'B', value:20}] } }})
```
