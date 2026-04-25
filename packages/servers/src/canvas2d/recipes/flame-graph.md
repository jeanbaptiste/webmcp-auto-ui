---
widget: canvas2d-flame-graph
description: Flame graph / icicle — hierarchical performance profiling
group: canvas2d
schema:
  type: object
  required: [root]
  properties:
    title: { type: string }
    root:
      type: object
      required: [name, value]
      properties:
        name: { type: string }
        value: { type: number }
        children: { type: array, items: { $ref: "#/properties/root" } }
---

## When to use
Visualize call stacks, CPU profiles, or any hierarchical time breakdown.

## How
```
widget_display({name: "canvas2d-flame-graph", params: {
  title: 'CPU Profile',
  root: {
    name: 'main', value: 100,
    children: [
      { name: 'parse', value: 40, children: [{ name: 'tokenize', value: 25 }] },
      { name: 'render', value: 60 }
    ]
  }
}})
```

## Example
```
canvas2d_webmcp_widget_display({name: "canvas2d-flame-graph", params: {title: "CPU Profile", root: {name: "main", value: 100, children: [{name: "parse", value: 40, children: [{name: "tokenize", value: 25}]}, {name: "render", value: 60}]}}})
```
