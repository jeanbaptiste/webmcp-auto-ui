---
widget: cluster-circles
description: Nodes clustered into circular groups based on a grouping attribute
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements with group data
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
              group:
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

Groups nodes into clusters based on a `group` data attribute, then arranges each cluster in a circular pattern. Uses the CoSE layout with compound nodes to visually separate clusters.

## How

1. Call `cytoscape_webmcp_widget_display({name: "cluster-circles", params: {elements: [{data: {id: "a", label: "A", group: "frontend"}}, {data: {id: "b", label: "B", group: "frontend"}}, {data: {id: "c", label: "C", group: "backend"}}, {data: {id: "d", label: "D", group: "backend"}}, {data: {source: "a", target: "c"}}, {data: {source: "b", target: "d"}}]}})`
