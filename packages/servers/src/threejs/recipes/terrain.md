---
widget: terrain
description: 3D heightmap terrain with altitude-based coloring. Topography, elevation data.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    heights:
      type: array
      description: Flat array of height values (row-major)
      items:
        type: number
    width:
      type: number
      description: Grid width (columns)
    depth:
      type: number
      description: Grid depth (rows)
    heightScale:
      type: number
      description: Height multiplier (default 1)
    colorStops:
      type: array
      description: "[threshold, color] pairs for altitude coloring"
      items:
        type: array
    wireframe:
      type: boolean
---

## When to use

Display terrain, elevation data, or any heightmap as a colored 3D surface.

## How

```
threejs_webmcp_widget_display({name: "terrain", params: {
  title: "Mountain",
  width: 5, depth: 5,
  heights: [0,1,2,1,0, 1,3,5,3,1, 2,5,8,5,2, 1,3,5,3,1, 0,1,2,1,0],
  heightScale: 0.5
}})
```
