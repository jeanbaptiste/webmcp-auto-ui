---
widget: echarts-tree
description: Interactive hierarchical tree with expand/collapse.
group: echarts
schema:
  type: object
  required: [root]
  properties:
    title: { type: string }
    root: { type: object, description: "Root node { name, children?, value? } — recursive" }
    orient: { type: string, description: "'LR' (default), 'RL', 'TB', 'BT'" }
    layout: { type: string, description: "'orthogonal' (default) or 'radial'" }
---

## When to use
Show hierarchical structures (org chart, file system, taxonomy). Node objects nest via `children`.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-tree", params: {
  root: { name: "root", children: [
    { name: "A", children: [{ name: "A1" }, { name: "A2" }] },
    { name: "B", children: [{ name: "B1" }] }
  ]},
  orient: "LR", title: "Org"
}})
```
