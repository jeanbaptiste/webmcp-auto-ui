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
threejs_webmcp_widget_display({name: "point-cloud", params: {
  title: "Sensor Data",
  points: [
    { x: 0, y: 1, z: 0, color: "#ff0000" },
    { x: 1, y: 0, z: 1, color: "#00ff00" },
    { x: -1, y: 0.5, z: -0.5 }
  ],
  pointSize: 0.03
}})
```

## Example
```
threejs_webmcp_widget_display({name: "point-cloud", params: { title: "LiDAR Scan", points: [{x:0,y:0,z:0,color:"#ff4444"},{x:1,y:0.5,z:0.2,color:"#44ff88"},{x:-0.5,y:1,z:0.8,color:"#4488ff"},{x:0.3,y:0.3,z:1.2,color:"#ffaa22"},{x:-1,y:0.8,z:0.4}], pointSize: 0.04 }})
```
