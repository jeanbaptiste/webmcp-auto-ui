---
widget: dendrogram
description: Dendrogram (hierarchical clustering as radial or linear tree)
group: d3
schema:
  type: object
  required:
    - root
  properties:
    title:
      type: string
    root:
      type: object
      description: "Tree node with name and children[]"
      required:
        - name
      properties:
        name:
          type: string
        children:
          type: array
    colorScheme:
      type: string
      description: "D3 color scheme name (default: Tableau10)"
    radial:
      type: boolean
      description: "Use radial layout (default: true)"
---

## When to use
For hierarchical clustering results, phylogenetic trees, or any dendrogram where all leaves are at the same depth level.

## How
1. Get clustering result from MCP
2. Call `d3_webmcp_widget_display('dendrogram', {root: {name: "root", children: [{name: "Cluster A", children: [{name: "Item 1"}, {name: "Item 2"}]}, {name: "Item 3"}]}})`

## Common errors
- Unlike tree, dendrogram aligns all leaves at the same radius/x-position
- Set `radial: false` for a traditional linear dendrogram
