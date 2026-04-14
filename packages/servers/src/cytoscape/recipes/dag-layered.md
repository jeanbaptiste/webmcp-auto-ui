---
widget: dag-layered
description: Layered DAG layout with rank-based node positioning
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements forming a layered DAG
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
      description: Optional layout overrides (rankSep, nodeSep, etc.)
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a layered DAG using the Dagre layout with emphasis on minimizing edge crossings. Nodes are assigned to ranks (layers) based on their depth in the graph. Great for compiler IR visualization, scheduling graphs, etc.

## How

1. Call `cytoscape_webmcp_widget_display({name: "dag-layered", params: {elements: [{data: {id: "src", label: "Source"}}, {data: {id: "parse", label: "Parse"}}, {data: {id: "opt", label: "Optimize"}}, {data: {id: "gen", label: "Generate"}}, {data: {source: "src", target: "parse"}}, {data: {source: "parse", target: "opt"}}, {data: {source: "opt", target: "gen"}}]}})`
