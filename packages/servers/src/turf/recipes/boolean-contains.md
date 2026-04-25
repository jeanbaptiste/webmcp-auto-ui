---
widget: turf-boolean-contains
description: Test whether feature A contains feature B (visual YES/NO).
group: turf
schema:
  type: object
  required: [a, b]
  properties:
    a: { type: object, description: "Outer feature (e.g. polygon)" }
    b: { type: object, description: "Inner feature" }
---

## When to use
Spatial containment test (region inside another region).

## Example
```
turf_webmcp_widget_display({name: "turf-boolean-contains", params: {a: {...outer}, b: {...inner}}})
```
