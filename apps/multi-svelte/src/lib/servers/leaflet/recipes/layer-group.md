---
widget: leaflet-layer-group
description: Organize map content into switchable layer groups with a control panel
group: layers
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    layers:
      type: array
      items:
        type: object
        properties:
          name:
            type: string
          markers:
            type: array
          circles:
            type: array
      description: "Named groups of markers/circles with toggle control"
---

## Layer Group

Organizes map features into named groups with a layer control panel. Users can toggle visibility of each group.

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 13,
  "layers": [
    { "name": "Hotels", "markers": [{ "latlng": [48.856, 2.352], "popup": "Hotel A" }] },
    { "name": "Restaurants", "markers": [{ "latlng": [48.858, 2.354], "popup": "Restaurant B" }] },
    { "name": "Zones", "circles": [{ "latlng": [48.857, 2.353], "radius": 200, "color": "#e74c3c" }] }
  ]
}
```
