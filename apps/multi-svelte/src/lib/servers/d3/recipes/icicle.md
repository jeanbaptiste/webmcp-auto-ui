---
widget: icicle
description: Icicle diagram (hierarchical data as stacked bars)
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
    orientation:
      type: string
      description: "vertical or horizontal (default: vertical)"
---

## When to use
Like sunburst but rectangular — easier to read labels. Good for file system visualization or flame charts.

## How
1. Get hierarchical data from MCP
2. Call `d3_webmcp_widget_display('icicle', {root: {name: "root", children: [{name: "A", value: 10}, {name: "B", children: [{name: "B1", value: 5}]}]}})`

## Common errors
- Same tree structure as treemap/sunburst
- Leaf nodes must have `value`
