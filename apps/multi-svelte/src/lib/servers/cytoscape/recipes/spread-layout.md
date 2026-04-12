---
widget: spread-layout
description: Spread layout that distributes nodes evenly across available space
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
      description: Optional layout overrides (minDist, etc.)
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Distributes nodes evenly to fill the available space while respecting edge connections. Uses the CoSE layout with high repulsion to achieve a spread-out appearance. Good for overview visualizations.

## How

1. Call `cytoscape_webmcp_widget_display({name: "spread-layout", params: {elements: [{data: {id: "a", label: "A"}}, {data: {id: "b", label: "B"}}, {data: {id: "c", label: "C"}}, {data: {id: "d", label: "D"}}, {data: {id: "e", label: "E"}}, {data: {source: "a", target: "b"}}, {data: {source: "c", target: "d"}}, {data: {source: "d", target: "e"}}]}})`
