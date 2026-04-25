---
widget: deckgl-trips
description: Animated trips with fading trails (TripsLayer). Vehicles, deliveries, GPS replays.
group: deckgl
schema:
  type: object
  required: [trips]
  properties:
    trips: { type: array, description: "Array of {path: [[lng,lat], ...], timestamps: [t0, t1, ...], color?, width?}" }
    trailLength: { type: number, description: "Trail duration in time units (default 180)" }
    animationSpeed: { type: number }
    color: { description: "Fallback trail color" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
---

## When to use
Animated playback of timed trajectories (taxi rides, drone flights, delivery routes).

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-trips", params: {
  trips: [{path:[[2.35,48.85],[2.34,48.87],[2.30,48.88]], timestamps:[0,30,90]}],
  pitch: 45, zoom: 13
}})
```
