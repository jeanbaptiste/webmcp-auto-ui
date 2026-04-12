---
id: rough-network-graph
name: Network Graph
description: Nodes and edges arranged in a circle layout
data:
  nodes:
    - { id: "a", label: "Server" }
    - { id: "b", label: "Client" }
    - { id: "c", label: "DB" }
    - { id: "d", label: "Cache" }
  edges:
    - { source: "a", target: "b" }
    - { source: "a", target: "c" }
    - { source: "a", target: "d" }
    - { source: "c", target: "d" }
  title: "System Architecture"
---

## Network Graph

Nodes connected by edges, arranged in a radial layout.

### Data format

- `nodes` — array of `{id, label?, x?, y?}` objects
- `edges` — array of `{source, target}` objects (ids)
- `title` — optional chart title
