---
widget: compound-tree
description: Hierarchical tree with compound (nested) nodes showing containment
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements with parent references for nesting. Each element is either a node ({data:{id, label, parent}}) or an edge ({data:{source, target}}), never both.
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

Renders a hierarchical tree where nodes can contain other nodes (compound structure). Uses CoSE-Bilkent for layout. The `parent` field in node data defines containment relationships.

## How

1. Call `cytoscape_webmcp_widget_display({name: "compound-tree", params: {elements: [{data: {id: "root", label: "App"}}, {data: {id: "ui", label: "UI", parent: "root"}}, {data: {id: "api", label: "API", parent: "root"}}, {data: {id: "btn", label: "Button", parent: "ui"}}, {data: {source: "btn", target: "api"}}]}})`

## Example
```
cytoscape_webmcp_widget_display({name: "compound-tree", params: {elements: [{data: {id: "root", label: "App"}}, {data: {id: "ui", label: "UI", parent: "root"}}, {data: {id: "api", label: "API", parent: "root"}}, {data: {id: "btn", label: "Button", parent: "ui"}}, {data: {source: "btn", target: "api"}}]}})
```
