---
widget: pixijs-waveform
description: Animated waveform visualization — oscillating sine waves with WebGL
schema:
  type: object
  properties:
    waves:
      type: number
      description: Number of overlapping waves (default 3)
    amplitude:
      type: number
      description: Wave height in pixels (default 50)
    frequency:
      type: number
      description: Wave frequency multiplier (default 1)
    color:
      type: string
      description: Wave color (hex)
    title:
      type: string
  required: []
---

## When to use

Use pixijs-waveform for audio-like animated wave displays. Ideal for:
- Audio visualizations
- Signal representations
- Ambient animated backgrounds

## How
1. Call `pixijs_webmcp_widget_display({name: "waveform", params: {waves: 4, amplitude: 60, frequency: 1.5, color: "#8b5cf6"}})`

## Examples

```json
{
  "waves": 4,
  "amplitude": 60,
  "frequency": 1.5,
  "color": "#8b5cf6",
  "title": "Audio Waveform"
}
```
