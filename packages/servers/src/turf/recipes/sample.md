---
widget: turf-sample
description: Random sample of N features from a FeatureCollection (sampled vs not).
group: turf
schema:
  type: object
  required: [features, num]
  properties:
    features: { type: object, description: "FeatureCollection" }
    num: { type: number, description: "Number of features to sample" }
---

## When to use
Subset large datasets randomly for visualization or testing.

## Example
```
turf_webmcp_widget_display({name: "turf-sample", params: {features: {...}, num: 20}})
```
