---
widget: plotly-mesh3d
description: 3D triangulated mesh surface.
group: plotly
schema:
  type: object
  required: [x, y, z]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: Vertex X coordinates }
    y: { type: array, items: { type: number }, description: Vertex Y coordinates }
    z: { type: array, items: { type: number }, description: Vertex Z coordinates }
    i: { type: array, items: { type: integer }, description: Triangle vertex indices (1st corner) }
    j: { type: array, items: { type: integer }, description: Triangle vertex indices (2nd corner) }
    k: { type: array, items: { type: integer }, description: Triangle vertex indices (3rd corner) }
    intensity: { type: array, items: { type: number }, description: Color intensity per vertex }
    colorscale: { type: string, description: "Colorscale (default 'Viridis')" }
    opacity: { type: number, description: Surface opacity 0-1 (default 0.8) }
---

## When to use
Render 3D meshes (CAD models, scientific surfaces, polyhedra).

## Example
```
widget_display('plotly-mesh3d', { x: [0,1,0,0], y: [0,0,1,0], z: [0,0,0,1], i: [0,0,0,1], j: [1,1,2,2], k: [2,3,3,3] })
```
