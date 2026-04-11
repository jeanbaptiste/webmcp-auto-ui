---
widget: terrain
description: 3D terrain heightmap with altitude-based coloring (green, brown, white). Topography, elevation data.
group: threejs
schema:
  type: object
  required:
    - heights
    - width
    - depth
  properties:
    title:
      type: string
    heights:
      type: array
      description: Flat array of height values (row-major, length = width * depth)
      items:
        type: number
    width:
      type: number
      description: Number of columns in the grid
    depth:
      type: number
      description: Number of rows in the grid
    heightScale:
      type: number
      description: Vertical exaggeration factor (default 1)
    colorStops:
      type: array
      description: Custom color stops as [height, color] pairs. Default green->brown->white
      items:
        type: array
    wireframe:
      type: boolean
      description: Show wireframe overlay (default false)
---

## When to use

Visualize elevation data, heightmaps, or any 2D grid of values as a 3D terrain surface.
Topographic maps, heatmap-as-terrain, noise visualizations, simulation output.

## How

Call `widget_display('terrain', { heights: [...], width: N, depth: M })`.

The `heights` array is row-major: first `width` values are the first row (closest to camera),
next `width` values are the second row, etc. Total length must equal `width * depth`.

Example — 5x5 terrain:
```
widget_display('terrain', {
  title: "Mountain Ridge",
  width: 5,
  depth: 5,
  heights: [
    0, 0, 0, 0, 0,
    0, 2, 3, 2, 0,
    0, 3, 8, 3, 0,
    0, 2, 3, 2, 0,
    0, 0, 0, 0, 0
  ],
  heightScale: 0.5
})
```

## Common errors

- heights.length != width * depth — causes a rendering error
- Very large grids (>200x200) without downsampling — performance issues
- Not normalizing height values — if values range from 1000 to 9000, set heightScale to 0.001
- Forgetting that the default color mapping is green (low) -> brown (mid) -> white (high)
