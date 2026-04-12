---
widget: centrality-map
description: Graph with nodes colored by betweenness centrality score
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
              source:
                type: string
              target:
                type: string
    layout:
      type: object
      description: Optional layout overrides
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Computes betweenness centrality for all nodes and maps the values to a color gradient (cold to hot). Nodes that act as bridges between communities appear in warmer colors. Uses Cytoscape's built-in `betweennessCentrality()`.

## How

1. Call `cytoscape_webmcp_widget_display({name: "centrality-map", params: {elements: [{data: {id: "a", label: "A"}}, {data: {id: "b", label: "B"}}, {data: {id: "c", label: "C"}}, {data: {id: "d", label: "D"}}, {data: {id: "e", label: "E"}}, {data: {source: "a", target: "b"}}, {data: {source: "b", target: "c"}}, {data: {source: "c", target: "d"}}, {data: {source: "d", target: "e"}}, {data: {source: "a", target: "c"}}]}})`
