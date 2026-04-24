---
widget: vegalite-concat
description: Compose multiple Vega-Lite specs side by side or stacked.
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    direction: { type: string, description: "'horizontal' | 'vertical' | 'wrap' (default)" }
    specs: { type: array, description: "Array of complete Vega-Lite child specs" }
---

## When to use
Dashboards: bar + line + summary side by side.
