---
widget: pixijs-gauge
description: Animated radial gauge with needle — shows a value within a min/max range
schema:
  type: object
  properties:
    value:
      type: number
      description: Current value
    min:
      type: number
      description: Minimum value (default 0)
    max:
      type: number
      description: Maximum value (default 100)
    title:
      type: string
    unit:
      type: string
      description: Unit label (e.g. "km/h", "%")
    color:
      type: string
      description: Gauge fill color (hex)
  required:
    - value
---

## When to use

Use pixijs-gauge for animated meter/speedometer displays. Ideal for:
- KPI dashboards
- Performance metrics
- Real-time sensor readings

## How
1. Call `pixijs_webmcp_widget_display({name: "gauge", params: {value: 73, max: 100, title: "CPU", unit: "%"}})`

## Examples

```json
{
  "value": 73,
  "min": 0,
  "max": 100,
  "title": "CPU Usage",
  "unit": "%",
  "color": "#f59e0b"
}
```
