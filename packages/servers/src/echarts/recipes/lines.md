---
widget: echarts-lines
description: Animated polylines on a cartesian plane — routes, paths, trajectories.
group: echarts
schema:
  type: object
  required: [routes]
  properties:
    title: { type: string }
    routes: { type: array, description: "[{ name?, coords: [[x,y], [x,y], ...] }, ...]" }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Flight paths, delivery routes, animated trajectories between points in 2D.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-lines", params: {
  routes: [
    { name: "A→B", coords: [[0,0],[5,3],[10,7]] },
    { name: "C→D", coords: [[2,8],[6,6],[9,2]] }
  ],
  title: "Routes"
}})
```
