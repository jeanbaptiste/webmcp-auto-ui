---
widget: map
description: Interactive map with markers
group: advanced
schema:
  type: object
  properties:
    title:
      type: string
    center:
      type: object
      properties:
        lat:
          type: number
        lng:
          type: number
    zoom:
      type: number
    height:
      type: string
    markers:
      type: array
      items:
        type: object
        required:
          - lat
          - lng
        properties:
          lat:
            type: number
          lng:
            type: number
          label:
            type: string
          color:
            type: string
---

## When to use
Display geolocated data — addresses, points of interest, itineraries, coverage areas. Ideal when the user asks "where is..." or "show on a map".

## How to use
1. Retrieve coordinates via MCP (lat/lng)
2. Set the center and zoom based on the extent of the data
3. Call `autoui_webmcp_widget_display('map', { title: 'Our offices', center: { lat: 48.8566, lng: 2.3522 }, zoom: 12, markers: [{ lat: 48.8566, lng: 2.3522, label: 'Paris HQ' }] })`

## Common mistakes
- Swapping lat and lng (latitude = North/South, longitude = East/West)
- Forgetting to center the map on the displayed markers
