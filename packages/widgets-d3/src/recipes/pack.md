---
widget: pack
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
      description: "Show labels on circles (default: true)"
---

## When to use
For hierarchical data visualized as nested circles (taxonomy, containment, organizational structure). Circle area encodes value, nesting encodes hierarchy.

## How
1. Get hierarchical data from MCP
2. Call `d3_webmcp_widget_display('pack', {root: {name: "World", children: [{name: "Europe", children: [{name: "France", value: 67}, {name: "Germany", value: 83}]}, {name: "Asia", children: [{name: "Japan", value: 125}]}]}})`

## Common errors
- Leaf nodes must have a `value` property
- All values must be positive (circles cannot have zero or negative area)
- Deep hierarchies work better with pack than with treemap
