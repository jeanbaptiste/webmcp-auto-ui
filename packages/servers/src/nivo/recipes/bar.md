---
widget: nivo-bar
description: Bar chart (vertical or horizontal, grouped or stacked). Clean Nivo styling.
group: nivo
schema:
  type: object
  required: [data, keys]
  properties:
    data: { type: array, description: "Array of rows, e.g. [{id: 'A', value: 10}]" }
    keys: { type: array, description: "Value keys to plot as bars, e.g. ['value']" }
    indexBy: { type: string, description: "Row property used as category (default 'id')" }
    groupMode: { type: string, description: "'stacked' (default) or 'grouped'" }
    layout: { type: string, description: "'vertical' (default) or 'horizontal'" }
    axisBottomLegend: { type: string, description: Bottom axis label }
    axisLeftLegend: { type: string, description: Left axis label }
---

## When to use
Compare categorical values with a polished, animated bar chart.

## Example
```
nivo_webmcp_widget_display({name: "nivo-bar", params: { data: [{id:'A', value:10},{id:'B', value:25}], keys: ['value'], indexBy: 'id' }})
```
