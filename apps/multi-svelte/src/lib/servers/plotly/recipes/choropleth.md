---
widget: plotly-choropleth
description: Choropleth map — color-coded countries/regions by value.
group: plotly
schema:
  type: object
  required: [locations, z]
  properties:
    title: { type: string, description: Chart title }
    locations: { type: array, items: { type: string }, description: ISO-3 country codes or FIPS state codes }
    z: { type: array, items: { type: number }, description: Values per location }
    locationmode: { type: string, description: "'ISO-3' (default), 'USA-states', 'country names'" }
    colorscale: { type: string, description: "Colorscale (default 'Viridis')" }
    text: { type: array, items: { type: string }, description: Hover text }
---

## When to use
Show geographic data intensity by country/region (GDP, population, etc.).

## Example
```
plotly_webmcp_widget_display({name: "plotly-choropleth", params: { locations: ['FRA','USA','JPN'], z: [67, 331, 125], locationmode: 'ISO-3', title: 'Population (M)' }})
```
