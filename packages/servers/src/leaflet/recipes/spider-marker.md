---
widget: leaflet-spider-marker
description: Spiderfied markers that separate overlapping points on click
group: markers
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    markers:
      type: array
      items:
        type: object
        properties:
          latlng:
            type: array
            items: { type: number }
          popup:
            type: string
---

## Spider Marker

When multiple markers overlap at the same location, clicking spiderfies them outward in a circle so each can be selected individually.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-spider-marker", params: {center: [48.85, 2.35], zoom: 15, markers: [{latlng: [48.8566, 2.3522], popup: "Restaurant A"}, {latlng: [48.8566, 2.3522], popup: "Restaurant B"}]}})`

## Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 15,
  "markers": [
    { "latlng": [48.8566, 2.3522], "popup": "Restaurant A" },
    { "latlng": [48.8566, 2.3522], "popup": "Restaurant B" },
    { "latlng": [48.8566, 2.3523], "popup": "Restaurant C" }
  ]
}
```
