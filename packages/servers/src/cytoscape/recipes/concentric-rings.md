---
widget: concentric-rings
description: Concentric circles layout based on node attributes (degree, weight, etc.)
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
              level:
                type: number
              source:
                type: string
              target:
                type: string
    layout:
      type: object
      description: Optional layout overrides (concentricBy, minNodeSpacing)
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Places nodes in concentric rings based on a metric (degree centrality by default, or a custom `level` data field). Nodes with higher values are placed closer to the center. Set `layout.concentric` to customize ordering.

## How

1. Call `cytoscape_webmcp_widget_display({name: "concentric-rings", params: {elements: [{data: {id: "core", label: "Core", level: 3}}, {data: {id: "mid1", label: "Mid 1", level: 2}}, {data: {id: "mid2", label: "Mid 2", level: 2}}, {data: {id: "outer1", label: "Outer 1", level: 1}}, {data: {source: "core", target: "mid1"}}, {data: {source: "core", target: "mid2"}}, {data: {source: "mid1", target: "outer1"}}]}})`
