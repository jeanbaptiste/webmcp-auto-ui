---
widget: g6-tree
description: Classic top-down tree (dendrogram). Accepts {root: {label, children}} or {nodes, edges}.
group: g6
schema:
  type: object
  properties:
    root:
      type: object
      description: "Tree root: {label, children: [{label, children?}]}"
    nodes: { type: array, description: "Alternative: flat node list" }
    edges: { type: array, description: "Alternative: flat edge list" }
    direction: { type: string, description: "'TB' (default), 'LR', 'BT', 'RL'" }
    nodeSep: { type: number }
    rankSep: { type: number }
---

## When to use
Org charts, taxonomies, syntax trees — strict parent/child hierarchies.

## Example
```
g6_webmcp_widget_display({name: "g6-tree", params: {
  root: {label: "root", children: [{label: "a"}, {label: "b", children: [{label:"b1"}]}]}
}})
```
