---
widget: g6-compact-box
description: Compact box tree (Reingold-Tilford-like). Tight horizontal layout for wide trees.
group: g6
schema:
  type: object
  properties:
    root: { type: object }
    nodes: { type: array }
    edges: { type: array }
    direction: { type: string, description: "'LR' (default), 'TB', 'RL', 'BT', 'H', 'V'" }
    hGap: { type: number, description: "Horizontal gap (default 50)" }
    vGap: { type: number, description: "Vertical gap (default 20)" }
---

## When to use
Wide hierarchical trees where you want maximum density and readable boxed labels.

## Example
```
g6_webmcp_widget_display({name: "g6-compact-box", params: {
  root: {label:"CEO", children:[
    {label:"CTO", children:[{label:"Eng1"},{label:"Eng2"}]},
    {label:"CFO", children:[{label:"Acct"}]}
  ]}
}})
```
