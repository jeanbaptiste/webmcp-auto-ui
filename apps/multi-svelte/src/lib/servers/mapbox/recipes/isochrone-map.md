---
widget: isochrone-map
description: Travel time isochrone zones (concentric regions showing reachability)
group: mapbox
schema:
  type: object
  properties:
    zones:
      type: array
      description: Array of zone objects with minutes, coordinates/polygon, and optional color
    isochrones:
      type: array
      description: Alias for zones
    colors:
      type: array
      description: Color palette for zones (default reds)
    fillOpacity:
      type: number
      description: Zone fill opacity (default 0.4)
    showLegend:
      type: boolean
      description: Show time legend (default true)
    center:
      type: array
      description: Map center and origin point [lng, lat]
    zoom:
      type: number
      description: Initial zoom level (default 12)
---

## Usage

Display travel time zones as concentric polygons around an origin point. Each zone represents how far you can travel in a given time. Without zone data, generates sample circular isochrones.

## How
1. Call `mapbox_webmcp_widget_display({name: "isochrone-map", params: {center: [2.3522, 48.8566], zoom: 12, zones: [{minutes: 15, coordinates: [[[2.3,48.83],[2.4,48.83],[2.4,48.88],[2.3,48.88],[2.3,48.83]]]}, {minutes: 5, coordinates: [[[2.33,48.84],[2.37,48.84],[2.37,48.87],[2.33,48.87],[2.33,48.84]]]}]}})`

## Example

```json
{
  "center": [2.3522, 48.8566],
  "zoom": 12,
  "zones": [
    {"minutes": 30, "coordinates": [[[2.2,48.8],[2.5,48.8],[2.5,48.9],[2.2,48.9],[2.2,48.8]]]},
    {"minutes": 15, "coordinates": [[[2.3,48.83],[2.4,48.83],[2.4,48.88],[2.3,48.88],[2.3,48.83]]]},
    {"minutes": 5, "coordinates": [[[2.33,48.84],[2.37,48.84],[2.37,48.87],[2.33,48.87],[2.33,48.84]]]}
  ],
  "colors": ["#fee5d9", "#fcae91", "#fb6a4a"]
}
```
