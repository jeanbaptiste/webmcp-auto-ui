---
widget: graph-force-fast
description: Fast force-directed layout using fCoSE for large graphs
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements (nodes and edges). Each element is either a node ({data:{id, label}}) or an edge ({data:{source, target}}), never both.
      items:
        type: object
        properties:
          data:
            type: object
            anyOf:
              - required: [id]
                not:
                  required: [source]
                properties:
                  id:
                    type: string
                  label:
                    type: string
              - required: [source, target]
                not:
                  required: [id]
                properties:
                  source:
                    type: string
                  target:
                    type: string
    layout:
      type: object
      description: Optional layout overrides for fCoSE
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a force-directed graph using fCoSE (fast Compound Spring Embedder), optimized for large graphs with hundreds of nodes. Significantly faster than standard CoSE while maintaining quality.

## How

1. Call `cytoscape_webmcp_widget_display({name: "graph-force-fast", params: {elements: [{data: {id: "a", label: "A"}}, {data: {id: "b", label: "B"}}, {data: {id: "c", label: "C"}}, {data: {id: "d", label: "D"}}, {data: {source: "a", target: "b"}}, {data: {source: "b", target: "c"}}, {data: {source: "c", target: "d"}}, {data: {source: "a", target: "d"}}]}})`

## Example
```
cytoscape_webmcp_widget_display({name: "graph-force-fast", params: {elements: [{data: {id: "a", label: "A"}}, {data: {id: "b", label: "B"}}, {data: {id: "c", label: "C"}}, {data: {id: "d", label: "D"}}, {data: {source: "a", target: "b"}}, {data: {source: "b", target: "c"}}, {data: {source: "c", target: "d"}}, {data: {source: "a", target: "d"}}]}})
```
