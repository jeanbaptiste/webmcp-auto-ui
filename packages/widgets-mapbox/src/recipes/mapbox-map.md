---
widget: mapbox-map
description: Interactive vector map with markers. Requires a Mapbox access token.
group: mapbox
schema:
  type: object
  required:
    - accessToken
  properties:
    accessToken:
      type: string
      description: Mapbox public access token (pk.*)
    center:
      type: array
      description: "[lng, lat] center of the map (default [0, 20])"
      items:
        type: number
    zoom:
      type: number
      description: Initial zoom level (default 2)
    style:
      type: string
      description: "Mapbox style URL (default mapbox://styles/mapbox/dark-v11)"
    markers:
      type: array
      description: Markers to place on the map
      items:
        type: object
        required:
          - lng
          - lat
        properties:
          lng:
            type: number
            description: Longitude
          lat:
            type: number
            description: Latitude
          label:
            type: string
            description: Popup text on click
          color:
            type: string
            description: "Marker color (default #4264fb)"
---

## When to use

Display an interactive vector map with optional markers. City locations, points of interest,
store locators, event maps, any geographic point data.

Requires a Mapbox access token passed via `data.accessToken`. Never hardcode tokens.

## How

Call `widget_display('mapbox-map', { accessToken: '...', center: [2.35, 48.86], zoom: 12, markers: [...] })`.

Note: center uses `[lng, lat]` order (Mapbox convention), NOT `[lat, lng]`.

Example — Paris landmarks:
```
widget_display('mapbox-map', {
  accessToken: "pk.xxx",
  center: [2.35, 48.86],
  zoom: 13,
  markers: [
    { lng: 2.2945, lat: 48.8584, label: "Eiffel Tower", color: "#ff4444" },
    { lng: 2.3499, lat: 48.8530, label: "Notre-Dame" },
    { lng: 2.3376, lat: 48.8606, label: "Louvre" }
  ]
})
```

## Common errors

- Missing `accessToken` — the widget shows an error message instead of the map
- Swapping lng/lat order in `center` (Mapbox uses [lng, lat], not [lat, lng])
- Using an expired or domain-restricted token
- Adding too many markers (>200) — use clustering or aggregation instead
