---
widget: deckgl-scatterplot
description: WebGL scatter plot of geo-points over a MapLibre basemap. Best for thousands to millions of points.
group: deckgl
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "Array of {lng, lat, radius?, color?}" }
    center: { type: array, description: "[lng, lat]" }
    zoom: { type: number }
    style: { type: string, description: "voyager (default), dark, positron, or full style URL" }
    pitch: { type: number }
    bearing: { type: number }
    radiusScale: { type: number, description: "Multiplier for getRadius (default 1)" }
    fillColor: { description: "[r,g,b,a] or '#rrggbb' fallback color" }
---

## When to use
Big point clouds on a map: stations, sensors, events, sightings.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-scatterplot", params: {
  points: [
    {lng: 2.35, lat: 48.85, radius: 200, color: "#e74c3c"},
    {lng: 2.30, lat: 48.87, radius: 400}
  ],
  center: [2.34, 48.86], zoom: 12
}})
```
