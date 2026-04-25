---
widget: agcharts-funnel
description: Funnel — sequential stage drop-off.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    stageKey: { type: string, description: "Default 'x'" }
    valueKey: { type: string, description: "Default 'y'" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-funnel", params: { data:[{x:'Visits',y:1000},{x:'Signups',y:300},{x:'Buy',y:80}] }})
```
