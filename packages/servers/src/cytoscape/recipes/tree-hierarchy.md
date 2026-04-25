---
widget: tree-hierarchy
description: Hierarchical tree layout with top-to-bottom or left-to-right orientation
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements forming a tree structure. Each element is either a node ({data: {id, label}}) or an edge ({data: {source, target}}), never both.
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
      description: Optional layout overrides (e.g. direction)
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a hierarchical tree using the Dagre layout engine. Ideal for org charts, file trees, and any parent-child relationships. Set `layout.rankDir` to 'TB' (top-bottom) or 'LR' (left-right).

## How

1. Call `cytoscape_webmcp_widget_display({name: "tree-hierarchy", params: {elements: [{data: {id: "ceo", label: "CEO"}}, {data: {id: "cto", label: "CTO"}}, {data: {id: "cfo", label: "CFO"}}, {data: {id: "dev", label: "Dev Lead"}}, {data: {source: "ceo", target: "cto"}}, {data: {source: "ceo", target: "cfo"}}, {data: {source: "cto", target: "dev"}}]}})`

## Example
```
cytoscape_webmcp_widget_display({name: "tree-hierarchy", params: {elements: [{data: {id: "ceo", label: "CEO"}}, {data: {id: "cto", label: "CTO"}}, {data: {id: "cfo", label: "CFO"}}, {data: {id: "dev", label: "Dev Lead"}}, {data: {source: "ceo", target: "cto"}}, {data: {source: "ceo", target: "cfo"}}, {data: {source: "cto", target: "dev"}}]}})
```
