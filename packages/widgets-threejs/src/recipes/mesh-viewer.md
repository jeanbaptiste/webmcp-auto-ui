---
widget: mesh-viewer
description: 3D mesh viewer accepting vertices and faces as JSON. CAD preview, procedural geometry, 3D models.
group: threejs
schema:
  type: object
  required:
    - vertices
    - faces
  properties:
    title:
      type: string
    vertices:
      type: array
      description: Flat array of vertex positions [x0,y0,z0, x1,y1,z1, ...]
      items:
        type: number
    faces:
      type: array
      description: Flat array of triangle face indices [a0,b0,c0, a1,b1,c1, ...]
      items:
        type: number
    color:
      type: string
      description: Mesh surface color (default #6688cc)
    wireframe:
      type: boolean
      description: Show wireframe (default false)
    flatShading:
      type: boolean
      description: Use flat shading instead of smooth (default true)
    autoCenter:
      type: boolean
      description: Auto-center the mesh in the viewport (default true)
---

## When to use

Display a 3D mesh from raw vertex/face data: procedural geometry, CAD preview,
mathematical surfaces, algorithmic output, simplified 3D models.

## How

Call `widget_display('mesh-viewer', { vertices: [...], faces: [...] })`.

Vertices is a flat array: [x0, y0, z0, x1, y1, z1, ...]. Length must be divisible by 3.
Faces is a flat array of triangle indices: [a0, b0, c0, a1, b1, c1, ...]. Length must be divisible by 3.

Example — a tetrahedron:
```
widget_display('mesh-viewer', {
  title: "Tetrahedron",
  vertices: [
    1, 1, 1,
    -1, -1, 1,
    -1, 1, -1,
    1, -1, -1
  ],
  faces: [
    0, 1, 2,
    0, 1, 3,
    0, 2, 3,
    1, 2, 3
  ],
  color: "#88aaff",
  flatShading: true
})
```

## Common errors

- vertices.length not divisible by 3 — each vertex needs x, y, z
- faces.length not divisible by 3 — each face needs 3 vertex indices
- Face indices out of bounds (>= vertices.length / 3)
- Very large meshes (>50k triangles) without LOD — simplify first
- Forgetting that face winding order affects normals — use consistent CCW winding
