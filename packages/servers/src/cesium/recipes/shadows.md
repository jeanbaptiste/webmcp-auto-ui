---
widget: cesium-shadows
description: Enable dynamic sun shadows + lighting on the globe at a given time of day.
group: cesium
schema:
  type: object
  properties:
    shadows: { type: boolean, description: Enable global shadows (default true) }
    terrainShadows: { type: boolean, description: Cast shadows from terrain (default false) }
    lighting: { type: boolean, description: Enable globe lighting (default true) }
    time: { type: string, description: ISO 8601 time for sun position }
    longitude: { type: number, description: Sample marker longitude }
    latitude: { type: number, description: Sample marker latitude }
    sample: { type: boolean, description: Add a sample sphere to cast a shadow (default true) }
---

## When to use
Showcase sun position, shadow studies, day/night lighting on the globe.

## Example
```
cesium_webmcp_widget_display({name: "cesium-shadows", params: { time: "2026-06-21T15:00:00Z", longitude: 2.35, latitude: 48.85 }})
```
