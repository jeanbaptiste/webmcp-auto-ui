---
widget: circle-graph
description: Nodes arranged in a circle with edges connecting them
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements (nodes and edges)
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

Renders all nodes in a circle with edges drawn between them. Useful for showing relationships in small networks, social graphs, or any graph where you want equal visual prominence for all nodes.

## How

1. Call `cytoscape_webmcp_widget_display({name: "circle-graph", params: {elements: [{data: {id: "a", label: "Alice"}}, {data: {id: "b", label: "Bob"}}, {data: {id: "c", label: "Carol"}}, {data: {id: "d", label: "Dave"}}, {data: {source: "a", target: "b"}}, {data: {source: "b", target: "c"}}, {data: {source: "c", target: "d"}}, {data: {source: "d", target: "a"}}]}})`
