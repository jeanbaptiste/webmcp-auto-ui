---
widget: tree-map-3d
description: 3D treemap with extruded blocks. Hierarchical data, file sizes, budgets.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    items:
      type: array
      items:
        type: object
        required: [value]
        properties:
          label:
            type: string
          value:
            type: number
          color:
            type: string
    maxHeight:
      type: number
    gap:
      type: number
    palette:
      type: array
      items:
        type: string
---

## When to use

Display hierarchical size data as extruded 3D blocks. File sizes, budgets, proportions.

## How

```
threejs_webmcp_widget_display({name: "tree-map-3d", params: {
  title: "Disk Usage",
  items: [
    { label: "src", value: 500 },
    { label: "node_modules", value: 1200 },
    { label: "dist", value: 300 },
    { label: "docs", value: 100 }
  ]
}})
```
