---
widget: g6-indented-tree
description: File-explorer-style indented tree with elbow connectors.
group: g6
schema:
  type: object
  properties:
    root: { type: object, description: "{label, children: [...]}" }
    nodes: { type: array }
    edges: { type: array }
    direction: { type: string, description: "'LR' (default), 'RL'" }
    indent: { type: number, description: "Per-level indent (default 30)" }
    rowSep: { type: number, description: "Row separation (default 24)" }
---

## When to use
File trees, nested menus, outlines — when vertical compactness matters.

## Example
```
g6_webmcp_widget_display({name: "g6-indented-tree", params: {
  root: {label:"src", children:[
    {label:"app", children:[{label:"index.ts"},{label:"server.ts"}]},
    {label:"lib", children:[{label:"util.ts"}]}
  ]}
}})
```
