---
widget: agcharts-radial-column
description: Radial column (Nightingale rose) — columns radiating from center.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    angleKey: { type: string, description: "Category around the polar axis (default 'x')" }
    radiusKey: { type: string, description: "Numeric magnitude (default 'y')" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-radial-column", params: { data:[{x:'A',y:30},{x:'B',y:60},{x:'C',y:45}] }})
```
