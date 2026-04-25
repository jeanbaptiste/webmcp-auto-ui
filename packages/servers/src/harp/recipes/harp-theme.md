---
widget: harp-theme
description: Switch between Harp.gl published themes (base / day / night) or pass a custom theme URL.
group: harp
schema:
  type: object
  properties:
    title: { type: string }
    theme: { type: string, description: "'base' | 'day' | 'night' | full URL" }
    projection: { type: string, description: "'mercator' or 'sphere'" }
    center: { type: array }
    zoom: { type: number }
    tilt: { type: number }
    heading: { type: number }
    apiKey: { type: string }
---

## When to use
Compare visual styles or switch to a night palette.

## Example
```
harp_webmcp_widget_display({name: "harp-theme", params: { theme: "night", center: [2.35, 48.86], zoom: 12 }})
```
