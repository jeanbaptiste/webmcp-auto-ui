---
widget: pie-chart-3d
description: Extruded 3D pie or donut chart. Proportions, market share.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    slices:
      type: array
      items:
        type: object
        required: [value]
        properties:
          value:
            type: number
          label:
            type: string
          color:
            type: string
    radius:
      type: number
    height:
      type: number
      description: Extrusion height (default 0.5)
    innerRadius:
      type: number
      description: Inner radius for donut (default 0)
---

## When to use

Show proportions in 3D. Set innerRadius > 0 for donut style.

## How

```
threejs_webmcp_widget_display({name: "pie-chart-3d", params: {
  title: "Market Share",
  slices: [
    { value: 45, label: "A", color: "#4488ff" },
    { value: 30, label: "B", color: "#44cc88" },
    { value: 25, label: "C", color: "#ff8844" }
  ],
  height: 0.5
}})
```

## Example
```
threejs_webmcp_widget_display({name: "pie-chart-3d", params: { title: "Browser Market Share", slices: [{value:65,label:"Chrome",color:"#4488ff"},{value:19,label:"Safari",color:"#ff8844"},{value:4,label:"Firefox",color:"#44cc88"},{value:12,label:"Other",color:"#aaaaaa"}], height: 0.6, innerRadius: 0 }})
```
