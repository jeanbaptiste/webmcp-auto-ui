---
widget: shortest-path
description: Graph highlighting the shortest path between two specified nodes
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements
      items:
        type: object
        properties:
          data:
            type: object
            properties:
              id:
                type: string
              label:
                type: string
              weight:
                type: number
              source:
                type: string
              target:
                type: string
    source:
      type: string
      description: ID of the source node for path finding
    target:
      type: string
      description: ID of the target node for path finding
    layout:
      type: object
      description: Optional layout overrides
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements, source, target]
---

## Usage

Finds and highlights the shortest path between two nodes using Dijkstra's algorithm. The path is rendered in a contrasting color. Edge `weight` data is used as the cost function if provided.

## How

1. Call `cytoscape_webmcp_widget_display({name: "shortest-path", params: {elements: [{data: {id: "a", label: "A"}}, {data: {id: "b", label: "B"}}, {data: {id: "c", label: "C"}}, {data: {id: "d", label: "D"}}, {data: {source: "a", target: "b", weight: 1}}, {data: {source: "b", target: "c", weight: 2}}, {data: {source: "a", target: "c", weight: 5}}, {data: {source: "c", target: "d", weight: 1}}], source: "a", target: "d"}})`
