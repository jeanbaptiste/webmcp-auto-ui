---
widget: graph-force-compound
description: Force-directed layout with compound (parent/child) node grouping
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements with optional parent field for compound nodes. Each element is either a node ({data:{id, label, parent}}) or an edge ({data:{source, target}}), never both.
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
                  parent:
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
      description: Optional layout overrides
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a force-directed graph with compound nodes (groups). Nodes with a `parent` field are visually nested inside the parent node. Uses the CoSE-Bilkent layout for better compound node handling.

## How

1. Call `cytoscape_webmcp_widget_display({name: "graph-force-compound", params: {elements: [{data: {id: "g1", label: "Team A"}}, {data: {id: "g2", label: "Team B"}}, {data: {id: "a", label: "Alice", parent: "g1"}}, {data: {id: "b", label: "Bob", parent: "g1"}}, {data: {id: "c", label: "Carol", parent: "g2"}}, {data: {source: "a", target: "c"}}]}})`
