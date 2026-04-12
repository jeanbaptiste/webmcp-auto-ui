---
widget: plotly-contourcarpet
description: Contour plot on a carpet coordinate system.
group: plotly
schema:
  type: object
  required: [a, b, z, carpetData]
  properties:
    title: { type: string, description: Chart title }
    a: { type: array, items: { type: number }, description: A-axis values }
    b: { type: array, items: { type: number }, description: B-axis values }
    z: { type: array, items: { type: number }, description: Contour values }
    carpet: { type: string, description: "Carpet ID (default 'carpet1')" }
    colorscale: { type: string, description: "Colorscale (default 'Viridis')" }
    carpetData:
      type: object
      required: [a, b, x, y]
      properties:
        a: { type: array, items: { type: number } }
        b: { type: array, items: { type: number } }
        x: { type: array }
        y: { type: array }
      description: The underlying carpet grid data
---

## When to use
Display contour lines in a curvilinear carpet coordinate system.

## Example
```
widget_display('plotly-contourcarpet', { a: [1,2,3,1,2,3,1,2,3], b: [1,1,1,2,2,2,3,3,3], z: [1,2,3,4,5,6,7,8,9], carpetData: { a: [1,2,3], b: [1,2,3], x: [[1,2,3],[1.5,2.5,3.5],[2,3,4]], y: [[1,1,1],[2,2,2],[3,3,3]] } })
```
