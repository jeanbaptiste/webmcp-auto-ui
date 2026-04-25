---
widget: sunburst
description: Sunburst diagram (hierarchical data as nested rings)
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
---

## When to use
For hierarchical data with multiple levels (org charts, file systems, budgets by category). Each ring represents a depth level; arc size encodes value.

## How
1. Get hierarchical data from MCP
2. Call `d3_webmcp_widget_display({name: "sunburst", params: {root: {name: "root", children: [{name: "A", value: 10}, {name: "B", children: [{name: "B1", value: 5}]}]}}})`

## Common errors
- Data must be a tree with `name` and `children` properties
- Leaf nodes need a `value` property (non-leaf nodes derive their value from children)
- Do not create circular references in the tree

## Example
```
d3_webmcp_widget_display({name: "sunburst", params: {title: "Company Headcount", root: {name: "Company", children: [{name: "Engineering", children: [{name: "Frontend", value: 12}, {name: "Backend", value: 18}, {name: "DevOps", value: 6}]}, {name: "Product", children: [{name: "Design", value: 8}, {name: "PM", value: 5}]}, {name: "Sales", value: 22}, {name: "Marketing", value: 14}]}}})
```
