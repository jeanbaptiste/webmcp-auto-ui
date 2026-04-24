---
widget: vega-sunburst
description: Sunburst — radial hierarchical partition.
group: vega
schema:
  type: object
  required: [nodes]
  properties:
    title: { type: string }
    nodes: { type: array, description: "Flat list [{ id, parent, name, size? }]. Root has parent=null." }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-sunburst", params: { nodes:[{id:1,parent:null,name:"root"},{id:2,parent:1,name:"A",size:10},{id:3,parent:1,name:"B",size:20},{id:4,parent:2,name:"A1",size:5}] } })
```
