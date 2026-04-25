---
widget: animated-flow
description: Graph with animated edges showing directional data flow
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements. Each element is either a node ({data:{id, label}}) or an edge ({data:{source, target, flow}}), never both.
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
                  flow:
                    type: number
    layout:
      type: object
      description: Optional layout overrides
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a graph with animated dashed edges that show the direction of flow. Edge width can be scaled by a `flow` data attribute. The animation creates a "marching ants" effect along edges.

## How

1. Call `cytoscape_webmcp_widget_display({name: "animated-flow", params: {elements: [{data: {id: "src", label: "Source"}}, {data: {id: "proc", label: "Processor"}}, {data: {id: "sink", label: "Sink"}}, {data: {source: "src", target: "proc", flow: 10}}, {data: {source: "proc", target: "sink", flow: 8}}]}})`

## Example
```
cytoscape_webmcp_widget_display({name: "animated-flow", params: {elements: [{data: {id: "src", label: "Source"}}, {data: {id: "proc", label: "Processor"}}, {data: {id: "sink", label: "Sink"}}, {data: {source: "src", target: "proc", flow: 10}}, {data: {source: "proc", target: "sink", flow: 8}}]}})
```
