---
widget: echarts-sunburst
description: Sunburst — hierarchical proportions as concentric rings.
group: echarts
schema:
  type: object
  required: [nodes]
  properties:
    title: { type: string }
    nodes: { type: array, description: "[{ name, value, children?: [...] }, ...]" }
---

## When to use
Show hierarchy + proportion at once. Click a segment to zoom into that subtree.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-sunburst", params: {
  nodes: [
    { name: "A", value: 10, children: [
      { name: "A1", value: 6 },
      { name: "A2", value: 4 }
    ]},
    { name: "B", value: 8 }
  ],
  title: "Share"
}})
```
