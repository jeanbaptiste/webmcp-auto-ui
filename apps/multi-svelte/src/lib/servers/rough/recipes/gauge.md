---
widget: rough-gauge
name: Gauge
description: Semicircular gauge showing a single value against a maximum
data:
  value: 72
  max: 100
  label: "CPU Usage"
  title: "System Monitor"
---

## Gauge

Half-circle meter with needle indicating current value.

### Data format

- `value` — current value
- `max` — maximum scale value
- `label` — description of what is measured
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "gauge", params: {value: 72, max: 100, label: "CPU Usage", title: "System Monitor"}})`
