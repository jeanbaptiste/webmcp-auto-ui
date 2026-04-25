---
widget: circle-pack
description: Circle packing (hierarchical data as nested circles)
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
      description: "Tree node with name, children[], and value (leaf)"
      required:
        - name
      properties:
        name:
          type: string
        value:
          type: number
        children:
          type: array
    colorScheme:
      type: string
      description: "D3 color scheme name (default: Tableau10)"
    showLabels:
      type: boolean
      description: "Show labels on leaf circles (default: true)"
---

## When to use
For hierarchical data where nesting relationships matter more than exact size comparison. Circles show containment naturally.

## How
1. Get hierarchical data from MCP
2. Call `d3_webmcp_widget_display({name: "circle-pack", params: {root: {name: "root", children: [{name: "A", value: 30}, {name: "B", children: [{name: "B1", value: 10}, {name: "B2", value: 20}]}]}}})`

## Common errors
- Leaf nodes must have a `value` property
- Circle packing wastes more space than treemap; use treemap for precise comparisons

## Example
```
d3_webmcp_widget_display({name: "circle-pack", params: {title: "Repository Size (KB)", root: {name: "repo", children: [{name: "src", children: [{name: "components", value: 420}, {name: "utils", value: 180}, {name: "hooks", value: 95}]}, {name: "tests", value: 210}, {name: "docs", value: 130}]}}})
```
