---
widget: tree
description: Tidy tree layout (hierarchical data as a tree diagram)
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
    orientation:
      type: string
      description: "horizontal or vertical (default: horizontal)"
---

## When to use
For showing parent-child relationships (org charts, decision trees, taxonomy). Unlike treemap, emphasis is on structure not size.

## How
1. Get tree-structured data from MCP
2. Call `d3_webmcp_widget_display({name: "tree", params: {root: {name: "CEO", children: [{name: "CTO", children: [{name: "Dev Lead"}]}, {name: "CFO"}]}}})`

## Common errors
- Nodes don't need `value` — this is a structural layout, not area-based
- Very large trees (>100 nodes) may need pagination or collapsing
