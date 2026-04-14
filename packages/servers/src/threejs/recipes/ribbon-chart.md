---
widget: ribbon-chart
description: 3D ribbon/band chart for time series. Multiple series as ribbons in depth.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    ribbons:
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
          color:
            type: string
    ribbonWidth:
      type: number
---

## When to use

Compare time series as 3D ribbons with depth separation between series.

## How

```
threejs_webmcp_widget_display({name: "ribbon-chart", params: {
  title: "Revenue Trends",
  ribbons: [
    { points: [{x:0,y:1},{x:1,y:3},{x:2,y:2},{x:3,y:4}], color: "#4488ff" },
    { points: [{x:0,y:2},{x:1,y:1},{x:2,y:3},{x:3,y:2}], color: "#44cc88" }
  ],
  ribbonWidth: 0.4
}})
```
