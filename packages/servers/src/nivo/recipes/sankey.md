---
widget: nivo-sankey
description: Sankey flow diagram — nodes and weighted links showing flow.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data:
      type: object
      description: "{ nodes: [{id}], links: [{source, target, value}] }"
    align: { type: string, description: "'justify' (default), 'start', 'end', 'center'" }
---

## When to use
Visualize flow (energy, users, budget) between categories.

## Example
```
nivo_webmcp_widget_display({name: "nivo-sankey", params: { data: { nodes: [{id:'A'},{id:'B'},{id:'C'}], links: [{source:'A', target:'B', value:5},{source:'B', target:'C', value:3}] } }})
```
