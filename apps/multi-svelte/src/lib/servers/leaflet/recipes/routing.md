---
widget: leaflet-routing
description: Calculate and display routes between waypoints using OSRM
group: interactive
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    waypoints:
      type: array
      items:
        type: array
        items: { type: number }
      description: "Array of [lat, lng] waypoints"
    routeWhileDragging:
      type: boolean
      description: "Recalculate route as waypoints are dragged (default: true)"
    profile:
      type: string
      description: "Routing profile: driving, walking, cycling"
  required: [waypoints]
---

## Routing

Calculates and displays the optimal route between waypoints using OSRM (Open Source Routing Machine). Supports drag-to-reroute.

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 13,
  "waypoints": [[48.8566, 2.3522], [48.8606, 2.3376], [48.8530, 2.3499]],
  "profile": "driving",
  "routeWhileDragging": true
}
```
