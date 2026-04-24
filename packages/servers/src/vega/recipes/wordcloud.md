---
widget: vega-wordcloud
description: Word cloud — text sized by frequency.
group: vega
schema:
  type: object
  required: [words, counts]
  properties:
    title: { type: string }
    words: { type: array, description: Array of strings }
    counts: { type: array, description: Array of numeric weights (same length as words) }
    scheme: { type: string, description: Vega color scheme (default category20) }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-wordcloud", params: { words:["cat","dog","fish","bird"], counts:[30,25,10,5] } })
```
