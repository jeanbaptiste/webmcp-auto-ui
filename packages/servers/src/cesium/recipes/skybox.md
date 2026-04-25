---
widget: cesium-skybox
description: Configure the surrounding skybox (stars), sun, moon, and background color.
group: cesium
schema:
  type: object
  properties:
    show: { type: boolean, description: Show skybox (default true) }
    sun: { type: boolean, description: Show sun (default true) }
    moon: { type: boolean, description: Show moon (default true) }
    backgroundColor: { type: string, description: CSS color for the background }
    sources: { type: object, description: Custom cubemap (positiveX/negativeX/...) }
---

## When to use
Custom space backdrop or simply tweak whether sun/moon/stars render.

## Example
```
cesium_webmcp_widget_display({name: "cesium-skybox", params: { sun: true, moon: false, backgroundColor: "#000010" }})
```
