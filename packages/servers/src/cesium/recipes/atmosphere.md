---
widget: cesium-atmosphere
description: Tune atmosphere, ground glow, sky lighting, and fog on the globe.
group: cesium
schema:
  type: object
  properties:
    skyAtmosphere: { type: boolean, description: Show sky atmosphere (default true) }
    groundAtmosphere: { type: boolean, description: Show ground atmosphere (default true) }
    lighting: { type: boolean, description: Enable globe lighting (default true) }
    fog: { type: boolean, description: Enable fog (default true) }
    hueShift: { type: number, description: Sky hue shift -1..1 }
    saturationShift: { type: number, description: Sky saturation shift -1..1 }
    brightnessShift: { type: number, description: Sky brightness shift -1..1 }
---

## When to use
Polish the look of the globe: warmer/cooler sky, glow at horizon, atmospheric fog.

## Example
```
cesium_webmcp_widget_display({name: "cesium-atmosphere", params: { hueShift: 0.1, brightnessShift: -0.2 }})
```
