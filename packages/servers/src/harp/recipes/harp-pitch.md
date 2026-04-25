---
widget: harp-pitch
description: Tilted camera Harp.gl view ideal for 3D buildings / extrusions.
group: harp
schema:
  type: object
  properties:
    title: { type: string }
    center: { type: array, description: Default Berlin center }
    zoom: { type: number, description: Default 17 }
    tilt: { type: number, description: Default 55 (degrees) }
    heading: { type: number, description: Default 30 }
    apiKey: { type: string }
---

## When to use
Inspect 3D building extrusions in a city center.

## Example
```
harp_webmcp_widget_display({name: "harp-pitch", params: { center: [13.405, 52.52], zoom: 17, tilt: 55 }})
```
