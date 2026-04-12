---
widget: leaflet-tile-layer
description: Display a map with a custom tile layer (XYZ tiles)
group: base-layers
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
      description: "Map center [lat, lng]"
    zoom:
      type: number
      description: "Initial zoom level"
    url:
      type: string
      description: "Tile URL template (e.g. https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png)"
    attribution:
      type: string
    opacity:
      type: number
---

## Tile Layer

Renders a Leaflet map with a custom XYZ tile layer. If no URL is provided, falls back to OpenStreetMap.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-tile-layer", params: {center: [48.85, 2.35], zoom: 13, url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}})`

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 13,
  "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "attribution": "© OpenStreetMap contributors"
}
```
