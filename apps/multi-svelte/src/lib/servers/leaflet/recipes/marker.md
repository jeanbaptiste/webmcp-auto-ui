---
widget: leaflet-marker
description: Display markers with popups and tooltips on a Leaflet map
group: markers
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
      description: "Map center [lat, lng]"
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
          tooltip:
            type: string
      description: "Array of markers with position, popup, and tooltip"
---

## Markers

Place one or more markers on the map. Each marker can have an optional popup (shown on click) and tooltip (shown on hover).

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 13,
  "markers": [
    { "latlng": [48.8566, 2.3522], "popup": "<b>Paris</b><br>City of Light", "tooltip": "Paris" },
    { "latlng": [48.8606, 2.3376], "popup": "Louvre Museum" }
  ]
}
```
