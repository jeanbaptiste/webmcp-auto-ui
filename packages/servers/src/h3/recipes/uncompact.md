---
widget: h3-uncompact
description: uncompactCells — show a compacted set expanded back to a uniform resolution
group: h3
schema:
  type: object
  properties:
    cells:
      type: array
      description: "Compacted (mixed-resolution) H3 indexes"
      items: { type: string }
    targetResolution: { type: number, description: "Target uniform resolution" }
    lat: { type: number, description: "Alternative: generate a compacted disk" }
    lng: { type: number }
    parentResolution: { type: number, description: "Disk resolution (default 5)" }
    k: { type: number, description: "Disk radius (default 2)" }
    style: { type: string, description: "Basemap (default 'voyager')" }
    opacity: { type: number, description: "Fill opacity (default 0.45)" }
---

## When to use
Inverse of `h3-compact`: expand a compacted set back to a uniform resolution for indexed lookups.

## Example
```
h3_webmcp_widget_display({name: "h3-uncompact", params: { lat: 48.8566, lng: 2.3522, parentResolution: 5, targetResolution: 8, k: 2 }})
```
