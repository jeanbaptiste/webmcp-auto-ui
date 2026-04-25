---
widget: leaflet-tile-provider
description: Display a map using a named tile provider (Stamen, CartoDB, ESRI, etc.)
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
    provider:
      type: string
      description: "Provider name (e.g. CartoDB.Positron, Stamen.Watercolor, Esri.WorldImagery)"
---

## Tile Provider

Uses the leaflet-providers plugin to load named basemaps. Common providers: CartoDB.Positron, CartoDB.DarkMatter, Stamen.Watercolor, Stamen.Toner, Esri.WorldImagery, OpenTopoMap.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-tile-provider", params: {center: [40.71, -74.00], zoom: 12, provider: "CartoDB.DarkMatter"}})`

## Example

```json
{
  "center": [40.7128, -74.006],
  "zoom": 12,
  "provider": "CartoDB.DarkMatter"
}
```
