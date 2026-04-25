---
widget: vegalite-layered
description: Multiple marks stacked on the same axes (e.g. line + point).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array }
    marks: { type: array, description: "List of mark types to overlay (default ['line','point'])" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Combine multiple visual encodings — line with markers, bar with rule, etc.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-layered", params: { title: "Temperature trend", values: [{x:"Mon",y:18},{x:"Tue",y:21},{x:"Wed",y:19},{x:"Thu",y:24},{x:"Fri",y:22}], marks: ["line","point"], xLabel: "Day", yLabel: "°C" }})
```
