---
widget: constrained-layout
description: Force-directed layout with alignment and positioning constraints
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
    constraints:
      type: array
      description: Array of alignment constraints (e.g. same-y, same-x)
    layout:
      type: object
      description: Optional layout overrides
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a force-directed graph with positioning constraints. Uses the Cola layout engine to enforce alignment rules (e.g. nodes at the same vertical or horizontal level). Provide constraints as an array of alignment objects.

## How

1. Call `cytoscape_webmcp_widget_display({name: "constrained-layout", params: {elements: [{data: {id: "a", label: "A"}}, {data: {id: "b", label: "B"}}, {data: {id: "c", label: "C"}}, {data: {source: "a", target: "b"}}, {data: {source: "b", target: "c"}}], constraints: [{type: "alignment", axis: "y", offsets: [{node: "a", offset: 0}, {node: "b", offset: 0}]}]}})`
