---
widget: molecule-viewer
description: Ball-and-stick molecular visualization. Chemistry, molecular structures.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    atoms:
      type: array
      items:
        type: object
        required: [x, y, z]
        properties:
          x:
            type: number
          y:
            type: number
          z:
            type: number
          element:
            type: string
            description: "Element symbol (H, C, N, O, etc.)"
          color:
            type: string
          radius:
            type: number
    bonds:
      type: array
      items:
        type: object
        required: [from, to]
        properties:
          from:
            type: number
          to:
            type: number
          color:
            type: string
    atomScale:
      type: number
    bondRadius:
      type: number
---

## When to use

Display molecular structures with atoms and bonds.

## How

```
widget_display('molecule-viewer', {
  title: "Water (H2O)",
  atoms: [
    { x: 0, y: 0, z: 0, element: "O" },
    { x: -0.8, y: 0.6, z: 0, element: "H" },
    { x: 0.8, y: 0.6, z: 0, element: "H" }
  ],
  bonds: [
    { from: 0, to: 1 },
    { from: 0, to: 2 }
  ]
})
```
