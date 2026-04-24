---
widget: nivo-tree
description: Hierarchical tree — classical tree or dendrogram layout.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data:
      type: object
      description: "{ name, children: [{ name, children? }, ...] }"
    mode: { type: string, description: "'tree' (default) or 'dendrogram'" }
    layout: { type: string, description: "'top-to-bottom' (default), 'bottom-to-top', 'left-to-right', 'right-to-left'" }
---

## When to use
Display parent-child hierarchies with classical tree layout.

## Example
```
nivo_webmcp_widget_display({name: "nivo-tree", params: { data: { name:'root', children:[{name:'A'},{name:'B', children:[{name:'B1'}]}] } }})
```
