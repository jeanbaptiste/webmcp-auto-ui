---
widget: leaflet-tile-wms
description: Display a WMS (Web Map Service) layer on a Leaflet map
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
    url:
      type: string
      description: "WMS service base URL"
    layers:
      type: string
      description: "Comma-separated WMS layer names"
    format:
      type: string
      description: "Image format (default: image/png)"
    transparent:
      type: boolean
    attribution:
      type: string
  required: [url, layers]
---

## WMS Tile Layer

Renders a WMS layer from a standards-compliant Web Map Service.

### Example

```json
{
  "center": [47.0, 2.0],
  "zoom": 6,
  "url": "https://ows.mundialis.de/services/service",
  "layers": "TOPO-OSM-WMS",
  "format": "image/png",
  "transparent": true
}
```
