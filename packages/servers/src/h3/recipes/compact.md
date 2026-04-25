---
widget: h3-compact
description: compactCells — show a compacted multi-resolution H3 set, colored by resolution
group: h3
schema:
  type: object
  properties:
    cells:
      type: array
      description: "Uniform-resolution H3 indexes to compact"
      items: { type: string }
    lat: { type: number, description: "Alternative: generate a disk to compact" }
    lng: { type: number }
    resolution: { type: number, description: "Disk resolution (default 8)" }
    k: { type: number, description: "Disk radius (default 4)" }
    style: { type: string, description: "Basemap (default 'voyager')" }
    opacity: { type: number, description: "Fill opacity (default 0.55)" }
---

## When to use
Demonstrate H3 compaction: a uniform set collapsed into mixed-resolution hexes for storage efficiency.

## Example
```
h3_webmcp_widget_display({name: "h3-compact", params: { lat: 48.8566, lng: 2.3522, resolution: 9, k: 5 }})
```
