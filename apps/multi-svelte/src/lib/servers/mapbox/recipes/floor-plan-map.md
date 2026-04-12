---
widget: floor-plan-map
description: Indoor floor plan overlay with labeled rooms/spaces
group: mapbox
schema:
  type: object
  properties:
    rooms:
      type: array
      description: Array of room objects with name, color, type, and polygon coordinates
    spaces:
      type: array
      description: Alias for rooms
    imageUrl:
      type: string
      description: Optional floor plan image URL for raster overlay
    imageBounds:
      type: array
      description: Image bounds as [[topLeft], [topRight], [bottomRight], [bottomLeft]]
    imageOpacity:
      type: number
      description: Image overlay opacity (default 0.7)
    fillOpacity:
      type: number
      description: Room fill opacity (default 0.4)
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level (default 18)
---

## Usage

Display an indoor floor plan as polygons on the map. Each room/space is a colored polygon with a label. Optionally overlay a raster floor plan image.

## How
1. Call `mapbox_webmcp_widget_display({name: "floor-plan-map", params: {rooms: [{name: "Office A", color: "#6366f1", coordinates: [[[2.352,48.856],[2.353,48.856],[2.353,48.857],[2.352,48.857],[2.352,48.856]]]}, {name: "Meeting Room", color: "#22c55e", coordinates: [[[2.353,48.856],[2.354,48.856],[2.354,48.857],[2.353,48.857],[2.353,48.856]]]}], center: [2.353, 48.856], zoom: 18}})`

## Example

```json
{
  "rooms": [
    {"name": "Office A", "color": "#6366f1", "coordinates": [[[2.352,48.856],[2.353,48.856],[2.353,48.857],[2.352,48.857],[2.352,48.856]]]},
    {"name": "Meeting Room", "color": "#22c55e", "coordinates": [[[2.353,48.856],[2.354,48.856],[2.354,48.857],[2.353,48.857],[2.353,48.856]]]}
  ],
  "center": [2.353, 48.856],
  "zoom": 18
}
```
