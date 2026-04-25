---
widget: cesium-clock
description: Configure the timeline/clock for time-aware animations (CZML, satellites).
group: cesium
schema:
  type: object
  properties:
    start: { type: string, description: ISO 8601 start time }
    stop: { type: string, description: ISO 8601 stop time }
    durationDays: { type: number, description: If no stop, days from start (default 1) }
    multiplier: { type: number, description: Clock speed multiplier (default 60) }
    shouldAnimate: { type: boolean, description: Auto-play (default true) }
---

## When to use
Drive time-stamped animations (satellite passes, weather, historical events).

## Example
```
cesium_webmcp_widget_display({name: "cesium-clock", params: { start: "2026-04-24T00:00:00Z", durationDays: 1, multiplier: 300 }})
```
