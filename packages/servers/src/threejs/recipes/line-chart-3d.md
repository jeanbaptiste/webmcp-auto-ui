---
widget: line-chart-3d
description: Multiple 3D line series in space. Time series comparison in depth.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    series:
      type: array
      items:
        type: object
        properties:
          points:
            type: array
            items:
              type: object
              properties:
                x:
                  type: number
                y:
                  type: number
                z:
                  type: number
          color:
            type: string
          showPoints:
            type: boolean
---

## When to use

Compare multiple line series in 3D space. Each series is offset in the Z axis.

## How

```
threejs_webmcp_widget_display({name: "line-chart-3d", params: {
  title: "Multi-Series",
  series: [
    { points: [{x:0,y:1},{x:1,y:3},{x:2,y:2}], color: "#ff4444" },
    { points: [{x:0,y:2},{x:1,y:1},{x:2,y:4}], color: "#4444ff" }
  ]
}})
```

## Example
```
threejs_webmcp_widget_display({name: "line-chart-3d", params: { title: "Monthly KPIs", series: [{points:[{x:0,y:10},{x:1,y:14},{x:2,y:12},{x:3,y:18}],color:"#ff4444",showPoints:true},{points:[{x:0,y:8},{x:1,y:11},{x:2,y:15},{x:3,y:13}],color:"#4488ff",showPoints:true}] }})
```
