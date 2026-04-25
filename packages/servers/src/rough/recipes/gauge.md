---
widget: rough-gauge
description: Semicircular gauge showing a single value against a maximum
schema:
  type: object
  required:
    - value
    - max
  properties:
    value:
      type: number
      description: Current value to display
    max:
      type: number
      description: Maximum scale value
    label:
      type: string
      description: What is being measured
    title:
      type: string
      description: Chart title
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

## Example
```
rough_webmcp_widget_display({name: "rough-gauge", params: {value: 72, max: 100, label: "CPU Usage", title: "System Monitor"}})
```
