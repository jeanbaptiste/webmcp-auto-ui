---
widget: kepler-csv-import
description: Generic CSV → Kepler. Pass a raw CSV string; columns and layers are auto-inferred.
group: kepler
schema:
  type: object
  required: [csv]
  properties:
    csv: { type: string, description: "Raw CSV text (with header row)" }
    label: { type: string, description: "Dataset label" }
---

## When to use
Quickest path from a CSV (e.g. fetched from an API) to an interactive Kepler map.

## Example
```
kepler_webmcp_widget_display({ name: "kepler-csv-import", params: { csv: "lat,lng,value\\n48.85,2.35,10\\n51.5,-0.1,25" } })
```
