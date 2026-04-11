---
widget: mapbox-3d
description: 3D buildings and terrain visualization. Requires a Mapbox access token.
group: mapbox
schema:
  type: object
  required:
    - accessToken
    - center
  properties:
    accessToken:
      type: string
      description: Mapbox public access token (pk.*)
    center:
      type: array
      description: "[lng, lat] center of the map"
      items:
        type: number
    zoom:
      type: number
      description: Initial zoom level (default 15)
    pitch:
      type: number
      description: Camera pitch in degrees (default 60)
    bearing:
      type: number
      description: Camera bearing in degrees (default -17.6)
    terrain:
      type: boolean
      description: Enable 3D terrain (default true)
    buildings3d:
      type: boolean
      description: Show 3D building extrusions (default true)
    style:
      type: string
      description: "Mapbox style URL (default mapbox://styles/mapbox/dark-v11)"
---

## When to use

Showcase a city skyline, urban landscape, or terrain in 3D. Architecture visualization,
real estate, urban planning, tourism — any use case where 3D depth enhances understanding.

Requires a Mapbox access token. Works best at zoom 14-17 in urban areas.

## How

Call `widget_display('mapbox-3d', { accessToken: '...', center: [-73.985, 40.758], zoom: 16 })`.

The widget enables 3D terrain and building extrusions by default. Disable either with
`terrain: false` or `buildings3d: false`.

Example — Manhattan skyline:
```
widget_display('mapbox-3d', {
  accessToken: "pk.xxx",
  center: [-73.985, 40.758],
  zoom: 16,
  pitch: 60,
  bearing: -17.6
})
```

## Common errors

- Low zoom level with buildings3d — buildings only appear at zoom >= 14
- Missing pitch — without pitch the 3D effect is not visible (set pitch >= 45)
- Terrain in flat areas has no visible effect — use mountainous regions for terrain demos
