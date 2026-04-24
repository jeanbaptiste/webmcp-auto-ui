---
widget: recharts-sankey
description: Sankey diagram — weighted flows between nodes. Budgets, migrations, energy flows.
group: recharts
schema:
  type: object
  required: [nodes, links]
  properties:
    nodes:
      type: array
      description: "[{name:'A'}, {name:'B'}, ...]"
    links:
      type: array
      description: "[{source:0, target:1, value:10}]"
---

## When to use
Trace the distribution of a quantity across sequential stages or flows between categories.

## Example
```
recharts_webmcp_widget_display({name: "recharts-sankey", params: {
  nodes: [{name:'A'},{name:'B'},{name:'C'}],
  links: [{source:0,target:1,value:10},{source:1,target:2,value:6}]
}})
```
