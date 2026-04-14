---
widget: grid-map
description: Grid layout placing nodes in rows and columns
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
              row:
                type: number
              col:
                type: number
              source:
                type: string
              target:
                type: string
    layout:
      type: object
      description: Optional layout overrides (rows, cols, etc.)
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Arranges nodes in a regular grid pattern. Optionally specify `layout.rows` or `layout.cols` to control the grid shape. Useful for matrix-like visualizations or structured networks.

## How

1. Call `cytoscape_webmcp_widget_display({name: "grid-map", params: {elements: [{data: {id: "a", label: "A"}}, {data: {id: "b", label: "B"}}, {data: {id: "c", label: "C"}}, {data: {id: "d", label: "D"}}, {data: {source: "a", target: "b"}}, {data: {source: "c", target: "d"}}], layout: {rows: 2}}})`
