---
widget: cesium-billboard
description: Camera-facing icon billboards positioned on the globe (POI markers).
group: cesium
schema:
  type: object
  required: [billboards]
  properties:
    billboards:
      type: array
      description: Array of {longitude, latitude, image, scale?, label?, height?}
---

## When to use
Place pictogram icons (airports, restaurants, hazards) that always face the camera.

## Example
```
cesium_webmcp_widget_display({name: "cesium-billboard", params: { billboards: [{longitude: 2.35, latitude: 48.85, image: "https://example.com/icon.png", label: "POI"}] }})
```
