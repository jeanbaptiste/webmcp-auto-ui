---
widget: observable-plot-spec
description: Generic widget — pass a full Observable Plot spec via `marks` array of {type, data, options}.
group: observable-plot
schema:
  type: object
  required: [marks]
  properties:
    title: { type: string }
    marks:
      type: array
      description: "Array of mark descriptors: [{type:'dot', data:[...], options:{x:'x',y:'y'}}, {type:'line', data:[...], options:{...}}]"
    plot: { type: object, description: "Additional top-level Plot options (scales, facet, projection)" }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Combining multiple marks, advanced Plot features not covered by dedicated widgets.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-spec", params: {
  marks: [
    { type: 'line', data: [{x:0,y:0},{x:1,y:1}], options: { x:'x', y:'y' } },
    { type: 'dot',  data: [{x:0.5,y:0.5}], options: { x:'x', y:'y', fill:'red' } }
  ]
}})
```
