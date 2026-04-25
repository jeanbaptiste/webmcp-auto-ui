---
widget: g6-dagre
description: Hierarchical DAG layout (Sugiyama-style). Best for directed acyclic graphs.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array }
    edges: { type: array }
    rankdir: { type: string, description: "'TB' (top-bottom, default), 'LR', 'BT', 'RL'" }
    align: { type: string, description: "'UL'|'UR'|'DL'|'DR' for ranking alignment" }
    nodesep: { type: number, description: "Horizontal node separation (default 30)" }
    ranksep: { type: number, description: "Vertical rank separation (default 60)" }
---

## When to use
Workflows, dependency graphs, build pipelines, ETL DAGs — anything with clear flow direction.

## Example
```
g6_webmcp_widget_display({name: "g6-dagre", params: {
  nodes:[{id:"start"},{id:"a"},{id:"b"},{id:"end"}],
  edges:[{source:"start",target:"a"},{source:"start",target:"b"},{source:"a",target:"end"},{source:"b",target:"end"}]
}})
```
