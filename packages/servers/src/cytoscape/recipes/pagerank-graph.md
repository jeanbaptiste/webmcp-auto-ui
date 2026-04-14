---
widget: pagerank-graph
description: Graph with node sizes scaled by PageRank algorithm
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

Computes PageRank on the graph and scales node sizes proportionally to their PageRank score. Higher-ranked nodes appear larger. Uses Cytoscape's built-in `pageRank()` algorithm.

## How

1. Call `cytoscape_webmcp_widget_display({name: "pagerank-graph", params: {elements: [{data: {id: "a", label: "Home"}}, {data: {id: "b", label: "About"}}, {data: {id: "c", label: "Blog"}}, {data: {id: "d", label: "Contact"}}, {data: {source: "a", target: "b"}}, {data: {source: "a", target: "c"}}, {data: {source: "b", target: "a"}}, {data: {source: "c", target: "a"}}, {data: {source: "d", target: "a"}}]}})`
