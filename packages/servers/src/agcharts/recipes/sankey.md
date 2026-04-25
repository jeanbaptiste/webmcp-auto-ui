---
widget: agcharts-sankey
description: Sankey diagram — flows between nodes (may require enterprise).
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    nodes: { type: array, description: "[{id, label?}]" }
    links: { type: array, description: "[{from, to, size}]" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-sankey", params: { links:[{from:'A',to:'B',size:10},{from:'B',to:'C',size:7}] }})
```

If your AG Charts build is community-only and Sankey is enterprise, the widget renders an inline error message rather than crashing.
