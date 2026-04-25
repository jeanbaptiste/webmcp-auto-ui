---
widget: cesium-model
description: Position a glTF/glb 3D model on the globe with heading/pitch/roll.
group: cesium
schema:
  type: object
  required: [url, longitude, latitude]
  properties:
    url: { type: string, description: URL to a .gltf or .glb file }
    longitude: { type: number }
    latitude: { type: number }
    height: { type: number, description: Altitude in meters }
    heading: { type: number, description: Heading degrees }
    pitch: { type: number, description: Pitch degrees }
    roll: { type: number, description: Roll degrees }
    scale: { type: number, description: Uniform scale (default 1) }
---

## When to use
Drop an aircraft, vehicle, or building 3D asset on a real-world location.

## Example
```
cesium_webmcp_widget_display({name: "cesium-model", params: { url: "https://example.com/plane.glb", longitude: 2.35, latitude: 48.85, height: 5000, heading: 45 }})
```
