---
widget: rough-network-graph
description: Nodes and edges arranged in a circle layout
schema:
  type: object
  required:
    - nodes
    - edges
  properties:
    nodes:
      type: array
      items:
        type: object
        required:
          - id
        properties:
          id:
            type: string
            description: Unique node identifier
          label:
            type: string
            description: Display label
          x:
            type: number
            description: Optional x position
          "y":
            type: number
            description: Optional y position
      description: Graph nodes
    edges:
      type: array
      items:
        type: object
        required:
          - source
          - target
        properties:
          source:
            type: string
            description: Source node id
          target:
            type: string
            description: Target node id
      description: Connections between nodes
    title:
      type: string
      description: Chart title
---

## Network Graph

Nodes connected by edges, arranged in a radial layout.

### Data format

- `nodes` — array of `{id, label?, x?, y?}` objects
- `edges` — array of `{source, target}` objects (ids)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "network-graph", params: {nodes: [{id: "a", label: "Server"}, {id: "b", label: "Client"}, {id: "c", label: "DB"}], edges: [{source: "a", target: "b"}, {source: "a", target: "c"}], title: "System Architecture"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-network-graph", params: {nodes: [{id: "api", label: "API"}, {id: "db", label: "Database"}, {id: "cache", label: "Cache"}, {id: "client", label: "Client"}], edges: [{source: "client", target: "api"}, {source: "api", target: "db"}, {source: "api", target: "cache"}], title: "Service Architecture"}})
```
