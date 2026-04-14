---
widget: voxel-grid
description: Minecraft-style voxel display. Discrete 3D data, building blocks.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    voxels:
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
          color:
            type: string
    voxelSize:
      type: number
      description: Size of each voxel (default 1)
    color:
      type: string
      description: Default voxel color
---

## When to use

Display discrete 3D grid data, building structures, or boolean 3D arrays.

## How

```
threejs_webmcp_widget_display({name: "voxel-grid", params: {
  title: "3D Structure",
  voxels: [
    { x: 0, y: 0, z: 0, color: "#ff0000" },
    { x: 1, y: 0, z: 0, color: "#00ff00" },
    { x: 0, y: 1, z: 0, color: "#0000ff" },
    { x: 0, y: 0, z: 1, color: "#ffff00" }
  ]
}})
```
