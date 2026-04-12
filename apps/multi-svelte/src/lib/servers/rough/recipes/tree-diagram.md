---
widget: rough-tree-diagram
description: Hierarchical tree with parent-child node connections
schema:
  type: object
  required:
    - root
  properties:
    root:
      type: object
      required:
        - label
      properties:
        label:
          type: string
          description: Node label
        children:
          type: array
          items:
            type: object
            properties:
              label:
                type: string
              children:
                type: array
                items:
                  type: object
          description: Child nodes (recursive structure)
      description: Root node of the tree hierarchy
    title:
      type: string
      description: Chart title
---

## Tree Diagram

Hierarchical tree structure with nodes and connecting lines.

### Data format

- `root` — recursive `{label, children?}` object
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "tree-diagram", params: {root: {label: "CEO", children: [{label: "CTO"}, {label: "CFO"}]}, title: "Org Chart"}})`
