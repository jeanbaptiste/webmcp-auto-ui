---
widget: nivo-sunburst
description: Hierarchical sunburst — radial tree of proportions.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data:
      type: object
      description: "Hierarchical tree: { name, children: [{ name, value } | { name, children }] }"
    value: { type: string, description: "Property holding leaf values (default 'value')" }
---

## When to use
Display hierarchical proportions with a radial layout.

## Example
```
nivo_webmcp_widget_display({name: "nivo-sunburst", params: { data: { name:'root', children:[{name:'A', value:5},{name:'B', value:10}] } }})
```
