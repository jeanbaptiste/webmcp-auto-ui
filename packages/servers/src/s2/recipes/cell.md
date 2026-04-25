---
widget: s2-cell
description: Render a single S2 cell at a (lat, lng) point at a given level.
group: s2
schema:
  type: object
  required: [lat, lng]
  properties:
    lat: { type: number, description: Latitude in degrees }
    lng: { type: number, description: Longitude in degrees }
    level: { type: number, description: "S2 level 0..30 (default 12, ~300m)" }
    style: { type: string, description: "'voyager' | 'dark' | 'positron'" }
    fillColor: { type: string, description: Cell fill color (hex) }
---

## When to use
Show the S2 cell that contains a specific location at a chosen resolution.

## Example
```
s2_webmcp_widget_display({name: "s2-cell", params: { lat: 48.8566, lng: 2.3522, level: 13 }})
```
