---
widget: point-cloud
description: Large point cloud with per-point colors. LiDAR, sensor data, distributions.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    points:
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
    pointSize:
      type: number
      description: Point size (default 0.02)
    color:
      type: string
      description: Default color (default #44aaff)
---

## When to use

Render thousands of 3D points: LiDAR scans, sensor data, statistical distributions.

## How

```
widget_display('point-cloud', {
  title: "Sensor Data",
  points: [
    { x: 0, y: 1, z: 0, color: "#ff0000" },
    { x: 1, y: 0, z: 1, color: "#00ff00" },
    { x: -1, y: 0.5, z: -0.5 }
  ],
  pointSize: 0.03
})
```
