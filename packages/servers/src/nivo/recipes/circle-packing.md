---
widget: nivo-circle-packing
description: Circle packing — nested circles proportional to value.
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
Hierarchical proportions in a circular packed layout.

## Example
```
nivo_webmcp_widget_display({name: "nivo-circle-packing", params: { data: { name:'root', children:[{name:'A', value:10},{name:'B', value:20}] } }})
```
