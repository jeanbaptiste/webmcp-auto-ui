---
widget: treemap
description: Treemap (hierarchical data as nested rectangles)
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
    tile:
      type: string
      description: "Tiling algorithm: squarify, binary, dice, slice, sliceDice (default: squarify)"
---

## When to use
For hierarchical data where you want to compare leaf sizes (disk usage, budget breakdown, portfolio allocation). Rectangle area encodes value.

## How
1. Get hierarchical data from MCP
2. Call `d3_webmcp_widget_display({name: "treemap", params: {root: {name: "Budget", children: [{name: "R&D", value: 500}, {name: "Marketing", children: [{name: "Ads", value: 200}, {name: "Events", value: 100}]}]}}})`

## Common errors
- Leaf nodes must have a `value` property
- Non-leaf nodes derive value from children; do not set `value` on non-leaf nodes
- Very deep hierarchies (>5 levels) become hard to read; consider sunburst instead

## Example
```
d3_webmcp_widget_display({name: "treemap", params: {title: "Disk Usage (GB)", root: {name: "Home", children: [{name: "Projects", children: [{name: "webmcp", value: 4.2}, {name: "blog", value: 1.8}, {name: "archive", value: 12.5}]}, {name: "Downloads", value: 8.7}, {name: "Photos", value: 24.3}, {name: "Documents", children: [{name: "Work", value: 3.1}, {name: "Personal", value: 1.4}]}]}}})
```
