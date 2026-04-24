---
widget: echarts-graph
description: Network graph — force-directed or circular layout with categories and draggable nodes.
group: echarts
schema:
  type: object
  required: [nodes, links]
  properties:
    title: { type: string }
    nodes: { type: array, description: "[{ id?, name, symbolSize?, category?, value? }, ...]" }
    links: { type: array, description: "[{ source, target, value? }, ...] using node names (or ids)" }
    categories: { type: array, description: "[{ name }, ...] for grouping and legend" }
    layout: { type: string, description: "'force' (default), 'circular', 'none'" }
---

## When to use
Relationships / networks: social graphs, dependency graphs, co-authorship.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-graph", params: {
  nodes: [
    { name: "Alice", symbolSize: 30, category: 0 },
    { name: "Bob",   symbolSize: 20, category: 0 },
    { name: "Carol", symbolSize: 25, category: 1 }
  ],
  links: [
    { source: "Alice", target: "Bob" },
    { source: "Alice", target: "Carol" }
  ],
  categories: [{ name: "Team A" }, { name: "Team B" }],
  title: "Collaboration"
}})
```
