---
widget: cesium-marker
description: Place colored point markers with optional labels on the globe.
group: cesium
schema:
  type: object
  required: [markers]
  properties:
    markers:
      type: array
      description: Array of marker objects {longitude, latitude, height?, label?, color?, size?}
---

## When to use
Pin cities, sensors, events, or any geolocated point with a label.

## Example
```
cesium_webmcp_widget_display({name: "cesium-marker", params: { markers: [{longitude: 2.35, latitude: 48.85, label: "Paris", color: "#ef4444"}, {longitude: -74, latitude: 40.7, label: "New York"}] }})
```
